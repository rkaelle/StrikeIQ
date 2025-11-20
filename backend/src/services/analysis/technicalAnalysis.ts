import { PrismaClient } from '@prisma/client';
// import { RSI, MACD, SMA, EMA, BollingerBands } from 'technicalindicators';

const prisma = new PrismaClient();

interface TechnicalAnalysisResult {
  score: number;
  volumeScore: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  currentPrice: number;
  nearestStrike: number;
  support: number;
  resistance: number;
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  vwap: number;
  bollingerBands: { upper: number; middle: number; lower: number };
}

export async function analyzeTechnicals(ticker: string): Promise<TechnicalAnalysisResult> {
  try {
    // Fetch recent market data
    const marketData = await prisma.marketData.findMany({
      where: { ticker },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    if (marketData.length === 0) {
      return getDefaultTechnicals();
    }

    const closes = marketData.map((d: any) => d.close).reverse();
    const highs = marketData.map((d: any) => d.high).reverse();
    const lows = marketData.map((d: any) => d.low).reverse();
    const volumes = marketData.map((d: any) => Number(d.volume)).reverse();

    const currentPrice = closes[closes.length - 1];

    // Calculate RSI
    const rsi = calculateRSI(closes, 14);

    // Calculate MACD
    const macd = calculateMACD(closes);

    // Calculate Bollinger Bands
    const bollingerBands = calculateBollingerBands(closes, 20);

    // Calculate VWAP
    const vwap = calculateVWAP(closes, volumes);

    // Find support and resistance
    const { support, resistance } = findSupportResistance(highs, lows, currentPrice);

    // Determine trend
    const sma20 = closes.slice(-20).reduce((a: any, b: any) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: any, b: any) => a + b, 0) / Math.min(50, closes.length);

    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (currentPrice > sma20 && sma20 > sma50 && rsi > 50) {
      trend = 'BULLISH';
    } else if (currentPrice < sma20 && sma20 < sma50 && rsi < 50) {
      trend = 'BEARISH';
    }

    // Calculate scores
    let technicalScore = 50;

    // RSI contribution
    if (rsi > 30 && rsi < 70) {
      technicalScore += 10;
    } else if (rsi < 30 || rsi > 70) {
      technicalScore += 15; // Oversold/overbought can be opportunities
    }

    // MACD contribution
    if (macd.histogram > 0) {
      technicalScore += 10;
    }

    // Trend contribution
    if (trend === 'BULLISH' || trend === 'BEARISH') {
      technicalScore += 15;
    }

    // Bollinger Bands contribution
    if (currentPrice <= bollingerBands.lower || currentPrice >= bollingerBands.upper) {
      technicalScore += 10;
    }

    technicalScore = Math.min(technicalScore, 100);

    // Volume score
    const avgVolume = volumes.slice(-20).reduce((a: any, b: any) => a + b, 0) / 20;
    const recentVolume = volumes.slice(-5).reduce((a: any, b: any) => a + b, 0) / 5;
    const volumeScore = Math.min((recentVolume / avgVolume) * 50, 100);

    // Find nearest strike (round to nearest 5 for most tickers)
    const nearestStrike = Math.round(currentPrice / 5) * 5;

    return {
      score: technicalScore,
      volumeScore,
      trend,
      currentPrice,
      nearestStrike,
      support,
      resistance,
      rsi,
      macd,
      vwap,
      bollingerBands
    };
  } catch (error) {
    console.error(`Technical analysis error for ${ticker}:`, error);
    return getDefaultTechnicals();
  }
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;

  // Simplified signal line
  const signalLine = macdLine * 0.9;
  const histogram = macdLine - signalLine;

  return { value: macdLine, signal: signalLine, histogram };
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a: any, b: any) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateBollingerBands(closes: number[], period: number): { upper: number; middle: number; lower: number } {
  const slice = closes.slice(-period);
  const middle = slice.reduce((a: any, b: any) => a + b, 0) / slice.length;

  const squaredDiffs = slice.map((value: any) => Math.pow(value - middle, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a: any, b: any) => a + b, 0) / slice.length);

  return {
    upper: middle + (stdDev * 2),
    middle,
    lower: middle - (stdDev * 2)
  };
}

function calculateVWAP(closes: number[], volumes: number[]): number {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < closes.length; i++) {
    cumulativeTPV += closes[i] * volumes[i];
    cumulativeVolume += volumes[i];
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : closes[closes.length - 1];
}

function findSupportResistance(highs: number[], lows: number[], currentPrice: number): { support: number; resistance: number } {
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);

  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);

  return { support, resistance };
}

function getDefaultTechnicals(): TechnicalAnalysisResult {
  return {
    score: 50,
    volumeScore: 50,
    trend: 'NEUTRAL',
    currentPrice: 100,
    nearestStrike: 100,
    support: 95,
    resistance: 105,
    rsi: 50,
    macd: { value: 0, signal: 0, histogram: 0 },
    vwap: 100,
    bollingerBands: { upper: 105, middle: 100, lower: 95 }
  };
}
