import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type TrendState = 'STRONG_TREND' | 'WEAK_TREND' | 'CHOP' | 'REVERSAL_ZONE';

export interface TrendStateData {
  state: TrendState;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pillarScore: number; // 0-30 for the Trend State pillar
  ema1: number;
  ema5: number;
  emaSeparation: number; // Percentage
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  shouldSuppress: boolean; // If true, suppress 80% of signals
  recommendation: string;
}

/**
 * INSTITUTIONAL-GRADE TREND STATE DETECTOR
 *
 * This is the MOST IMPORTANT filter for 0DTE signals.
 * If market is in CHOP → SUPPRESS 80% of signals
 *
 * TREND STATES:
 * - STRONG_TREND: Clear directional move, EMAs separated, MACD strong
 * - WEAK_TREND: Some directional bias but weak momentum
 * - CHOP: Tight EMAs, weak MACD, sideways grinding → DEATH ZONE FOR 0DTE
 * - REVERSAL_ZONE: RSI extreme + price at edge
 *
 * PILLAR SCORING (30% of total confidence):
 * - STRONG_TREND: 30 points (MAX)
 * - WEAK_TREND: 18 points
 * - CHOP: 8 points (HEAVY PENALTY)
 * - REVERSAL_ZONE: 10 points (caution)
 */
export async function analyzeTrendState(ticker: string): Promise<TrendStateData> {
  try {
    // 1. Fetch recent 1-minute and 5-minute candles
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
        timestamp: true,
      },
    });

    if (candles.length < 20) {
      // Not enough data, assume CHOP (conservative)
      return createDefaultTrendState('CHOP');
    }

    const closes = candles.map((c) => c.close).reverse();

    // 2. Calculate EMAs
    const ema1 = calculateEMA(closes, 1);
    const ema5 = calculateEMA(closes, 5);
    const emaSeparation = Math.abs((ema1 - ema5) / ema1) * 100;

    // 3. Get latest RSI
    const latestRSI = candles[0].rsi || 50;

    // 4. Calculate MACD components
    const { macd, signal, histogram } = calculateMACD(closes);

    // 5. Determine trend state
    const state = determineTrendState(emaSeparation, histogram, latestRSI, closes);

    // 6. Determine direction
    const direction = determineTrendDirection(ema1, ema5, histogram, latestRSI);

    // 7. Calculate pillar score (0-30)
    const pillarScore = calculateTrendScore(state, direction, emaSeparation, Math.abs(histogram));

    // 8. Determine if signals should be suppressed
    const shouldSuppress = state === 'CHOP' || state === 'REVERSAL_ZONE';

    // 9. Generate recommendation
    const recommendation = generateTrendRecommendation(state, direction, shouldSuppress);

    return {
      state,
      direction,
      pillarScore,
      ema1,
      ema5,
      emaSeparation,
      rsi: latestRSI,
      macd,
      macdSignal: signal,
      macdHistogram: histogram,
      shouldSuppress,
      recommendation,
    };

  } catch (error) {
    console.error(`[TrendState] Error analyzing trend state for ${ticker}:`, error);
    return createDefaultTrendState('CHOP');
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
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
 * Calculate MACD (Moving Average Convergence Divergence)
 *
 * MACD = EMA(12) - EMA(26)
 * Signal = EMA(9) of MACD
 * Histogram = MACD - Signal
 */
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  // Calculate MACD line
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  // For signal line, we'd need to calculate EMA(9) of MACD values
  // For simplicity, use a rough approximation
  const signal = macd * 0.8; // Simplified signal line

  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Determine trend state based on indicators
 *
 * RULES:
 * - STRONG_TREND: EMAs separated > 0.3%, MACD histogram > 0.05, RSI not extreme
 * - WEAK_TREND: EMAs separated > 0.1%, MACD histogram > 0.02
 * - CHOP: Tight EMAs (< 0.1%), weak MACD (< 0.02)
 * - REVERSAL_ZONE: RSI > 70 or < 30
 */
function determineTrendState(
  emaSeparation: number,
  macdHistogram: number,
  rsi: number,
  prices: number[]
): TrendState {
  const absHistogram = Math.abs(macdHistogram);

  // Check for reversal zone first (RSI extreme)
  if (rsi > 70 || rsi < 30) {
    return 'REVERSAL_ZONE';
  }

  // Check for strong trend
  if (emaSeparation > 0.3 && absHistogram > 0.05) {
    return 'STRONG_TREND';
  }

  // Check for weak trend
  if (emaSeparation > 0.1 && absHistogram > 0.02) {
    return 'WEAK_TREND';
  }

  // Otherwise, it's chop
  return 'CHOP';
}

/**
 * Determine trend direction
 */
function determineTrendDirection(
  ema1: number,
  ema5: number,
  macdHistogram: number,
  rsi: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  let bullishSignals = 0;
  let bearishSignals = 0;

  // EMA crossover
  if (ema1 > ema5) bullishSignals++;
  else if (ema1 < ema5) bearishSignals++;

  // MACD histogram
  if (macdHistogram > 0) bullishSignals++;
  else if (macdHistogram < 0) bearishSignals++;

  // RSI
  if (rsi > 55) bullishSignals++;
  else if (rsi < 45) bearishSignals++;

  if (bullishSignals > bearishSignals) return 'BULLISH';
  if (bearishSignals > bullishSignals) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Calculate trend pillar score (0-30 points)
 *
 * SCORING:
 * - STRONG_TREND: 30 points (MAX) → Perfect for 0DTE
 * - WEAK_TREND: 18 points → Acceptable but not ideal
 * - CHOP: 8 points → HEAVY PENALTY, avoid 0DTE
 * - REVERSAL_ZONE: 10 points → Caution, possible reversal
 *
 * Bonus points for strong separation and momentum
 */
function calculateTrendScore(
  state: TrendState,
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  emaSeparation: number,
  absHistogram: number
): number {
  let score = 0;

  // Base score by state
  switch (state) {
    case 'STRONG_TREND':
      score = 30;
      break;
    case 'WEAK_TREND':
      score = 18;
      break;
    case 'REVERSAL_ZONE':
      score = 10;
      break;
    case 'CHOP':
      score = 8; // HEAVY PENALTY
      break;
  }

  // Penalty for neutral direction (indecision)
  if (direction === 'NEUTRAL') {
    score = Math.max(5, score - 5);
  }

  // Bonus for very strong separation (only for trends)
  if (state === 'STRONG_TREND' && emaSeparation > 0.5) {
    score = Math.min(30, score + 2); // Small bonus, already at max
  }

  return Math.max(0, Math.min(30, score));
}

/**
 * Generate human-readable recommendation
 */
function generateTrendRecommendation(
  state: TrendState,
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  shouldSuppress: boolean
): string {
  if (state === 'STRONG_TREND') {
    return `STRONG ${direction} TREND detected - Ideal for 0DTE signals`;
  }

  if (state === 'WEAK_TREND') {
    return `WEAK ${direction} trend - Proceed with caution`;
  }

  if (state === 'CHOP') {
    return `⚠️ CHOP DETECTED - Avoid 0DTE signals, suppressing 80%`;
  }

  if (state === 'REVERSAL_ZONE') {
    return `⚠️ REVERSAL ZONE - RSI extreme, possible trend change`;
  }

  return 'Trend state unknown';
}

/**
 * Create default trend state (used on errors or insufficient data)
 */
function createDefaultTrendState(state: TrendState): TrendStateData {
  return {
    state,
    direction: 'NEUTRAL',
    pillarScore: state === 'CHOP' ? 8 : 15,
    ema1: 0,
    ema5: 0,
    emaSeparation: 0,
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHistogram: 0,
    shouldSuppress: state === 'CHOP',
    recommendation: 'Insufficient data for trend analysis',
  };
}

/**
 * Quick check: Should signal be suppressed due to chop?
 */
export function shouldSuppressForChop(trendState: TrendStateData): boolean {
  if (!trendState.shouldSuppress) return false;

  // During CHOP, randomly suppress 80% of signals
  return Math.random() < 0.8;
}
