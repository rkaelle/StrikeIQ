import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type VolatilityRegime = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type MarketState = 'STRONG_TREND' | 'WEAK_TREND' | 'CHOP' | 'REVERSAL_ZONE';

export interface VolatilityRegimeData {
  regime: VolatilityRegime;
  marketState: MarketState;
  vix: number;
  vixTrend: 'RISING' | 'FALLING' | 'FLAT';
  rvol: number; // Relative volume vs 20-day average
  confidenceCap: number; // Max confidence allowed in this regime
  shouldSuppressSignals: boolean; // If true, suppress 80% of signals
  pillarScore: number; // 0-20 for the Volatility Conditions pillar
}

/**
 * INSTITUTIONAL-GRADE VOLATILITY REGIME DETECTOR
 *
 * Determines market conditions and applies confidence caps:
 * - CHOP markets → Auto-cap confidence at 30%, suppress 80% of signals
 * - TRENDING + HIGH VOL → Boost confidence
 * - FLAT + LOW VOL → Suppress signals
 *
 * This is the KEY to avoiding 0DTE death during sideways grinding.
 */
export async function analyzeVolatilityRegime(ticker: string): Promise<VolatilityRegimeData> {
  try {
    // 1. Get current VIX
    const vixData = await prisma.marketData.findFirst({
      where: { ticker: 'VIX' },
      orderBy: { timestamp: 'desc' },
      select: { close: true, timestamp: true },
    });

    const vix = vixData?.close || 15; // Default to neutral VIX

    // 2. Get VIX history to determine trend
    const vixHistory = await prisma.marketData.findMany({
      where: {
        ticker: 'VIX',
        timestamp: {
          gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Last 5 days
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { close: true },
    });

    const vixTrend = determineVIXTrend(vixHistory.map((v) => v.close), vix);

    // 3. Get ticker volume data for RVOL calculation
    const recentVolume = await prisma.marketData.findFirst({
      where: { ticker },
      orderBy: { timestamp: 'desc' },
      select: { volume: true },
    });

    const avgVolume = await prisma.marketData.aggregate({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // Last 20 days
        },
      },
      _avg: { volume: true },
    });

    const rvol = recentVolume && avgVolume._avg.volume
      ? Number(recentVolume.volume) / Number(avgVolume._avg.volume)
      : 1.0;

    // 4. Determine volatility regime
    const regime = determineVolatilityRegime(vix);

    // 5. Determine market state (trend vs chop)
    const marketState = await determineMarketState(ticker);

    // 6. Calculate confidence cap and suppression rules
    const { confidenceCap, shouldSuppressSignals, pillarScore } = calculateVolatilityRules(
      regime,
      marketState,
      vix,
      vixTrend,
      rvol
    );

    return {
      regime,
      marketState,
      vix,
      vixTrend,
      rvol,
      confidenceCap,
      shouldSuppressSignals,
      pillarScore,
    };

  } catch (error) {
    console.error(`[VolRegime] Error analyzing volatility regime for ${ticker}:`, error);
    // Return conservative defaults
    return {
      regime: 'MEDIUM',
      marketState: 'CHOP',
      vix: 15,
      vixTrend: 'FLAT',
      rvol: 1.0,
      confidenceCap: 50,
      shouldSuppressSignals: true,
      pillarScore: 10,
    };
  }
}

/**
 * Determine VIX trend direction
 */
function determineVIXTrend(vixHistory: number[], currentVIX: number): 'RISING' | 'FALLING' | 'FLAT' {
  if (vixHistory.length < 5) return 'FLAT';

  const recentAvg = vixHistory.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const olderAvg = vixHistory.slice(5, 10).reduce((a, b) => a + b, 0) / 5;

  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 5) return 'RISING';
  if (change < -5) return 'FALLING';
  return 'FLAT';
}

/**
 * Classify VIX level into regime
 */
function determineVolatilityRegime(vix: number): VolatilityRegime {
  if (vix >= 30) return 'EXTREME';
  if (vix >= 20) return 'HIGH';
  if (vix >= 15) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determine if market is trending or chopping
 *
 * Uses EMAs and MACD to detect chop conditions
 */
async function determineMarketState(ticker: string): Promise<MarketState> {
  try {
    // Get recent 1-minute candles
    const candles = await prisma.marketData.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 60,
      select: {
        close: true,
        high: true,
        low: true,
        rsi: true,
        macd: true,
      },
    });

    if (candles.length < 20) return 'CHOP'; // Not enough data = assume chop

    const closes = candles.map((c) => c.close).reverse();

    // Calculate 1-min and 5-min EMAs
    const ema1 = calculateEMA(closes, 1);
    const ema5 = calculateEMA(closes, 5);

    // Check EMA separation
    const emaSeparation = Math.abs(ema1 - ema5);
    const emaSeparationPct = (emaSeparation / ema1) * 100;

    // Get latest MACD (if available)
    const latestMACD = candles[0].macd || 0;

    // Get latest RSI (if available)
    const latestRSI = candles[0].rsi || 50;

    // Calculate price volatility (high-low range)
    const priceRange = Math.max(...candles.map((c) => c.high)) - Math.min(...candles.map((c) => c.low));
    const priceRangePct = (priceRange / ema1) * 100;

    // Determine market state
    // STRONG TREND: Clear EMA separation + strong MACD + reasonable volatility
    if (emaSeparationPct > 0.3 && Math.abs(latestMACD) > 0.05 && priceRangePct > 0.5) {
      return 'STRONG_TREND';
    }

    // WEAK TREND: Some separation but weak momentum
    if (emaSeparationPct > 0.1 && Math.abs(latestMACD) > 0.02) {
      return 'WEAK_TREND';
    }

    // REVERSAL ZONE: RSI extreme + price at edge of range
    if (latestRSI > 70 || latestRSI < 30) {
      return 'REVERSAL_ZONE';
    }

    // CHOP: Tight EMAs, weak MACD, low volatility
    return 'CHOP';

  } catch (error) {
    console.error(`[MarketState] Error determining market state for ${ticker}:`, error);
    return 'CHOP'; // Assume chop on error
  }
}

/**
 * Calculate simple EMA
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (period === 1) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate confidence cap and suppression rules based on volatility regime
 *
 * PILLAR SCORING (20% of total confidence):
 * - STRONG TREND + RISING VIX + HIGH RVOL = 20 points (MASSIVE BOOST)
 * - CHOP + FLAT VIX + LOW RVOL = 5 points (SUPPRESSED)
 */
function calculateVolatilityRules(
  regime: VolatilityRegime,
  marketState: MarketState,
  vix: number,
  vixTrend: 'RISING' | 'FALLING' | 'FLAT',
  rvol: number
): { confidenceCap: number; shouldSuppressSignals: boolean; pillarScore: number } {

  let pillarScore = 10; // Start at neutral
  let confidenceCap = 100;
  let shouldSuppressSignals = false;

  // BOOST CONDITIONS (favorable for 0DTE)
  if (marketState === 'STRONG_TREND' && vixTrend === 'RISING' && rvol > 1.3) {
    pillarScore = 20; // MAX SCORE
    confidenceCap = 100;
    shouldSuppressSignals = false;
  }
  // Good conditions but not perfect
  else if (marketState === 'STRONG_TREND' && rvol > 1.1) {
    pillarScore = 17;
    confidenceCap = 90;
    shouldSuppressSignals = false;
  }
  else if (marketState === 'WEAK_TREND' && vixTrend === 'RISING') {
    pillarScore = 14;
    confidenceCap = 75;
    shouldSuppressSignals = false;
  }

  // SUPPRESS CONDITIONS (death zone for 0DTE)
  else if (marketState === 'CHOP' && vixTrend === 'FLAT' && rvol < 1.0) {
    pillarScore = 5; // HEAVILY PENALIZED
    confidenceCap = 30; // Cap at 30%
    shouldSuppressSignals = true; // Suppress 80% of signals
  }
  else if (marketState === 'CHOP') {
    pillarScore = 8;
    confidenceCap = 40;
    shouldSuppressSignals = true;
  }
  else if (marketState === 'REVERSAL_ZONE') {
    pillarScore = 7;
    confidenceCap = 45;
    shouldSuppressSignals = true;
  }

  // Adjust for extreme volatility
  if (regime === 'EXTREME') {
    pillarScore = Math.max(5, pillarScore - 3); // Penalize extreme vol
    confidenceCap = Math.min(confidenceCap, 60);
  }

  return { confidenceCap, shouldSuppressSignals, pillarScore };
}

/**
 * Quick check: Should this signal be suppressed?
 *
 * During CHOP conditions, randomly suppress 80% of signals
 */
export function shouldSuppressSignal(regimeData: VolatilityRegimeData): boolean {
  if (!regimeData.shouldSuppressSignals) return false;

  // Suppress 80% of signals during chop
  return Math.random() < 0.8;
}
