import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CorrelationData {
  isConfirmed: boolean;
  pillarScore: number; // 0-10 for the Cross-Ticker Confirmation pillar
  indexDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tickerDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  correlation: number; // -1 to 1
  recommendation: string;
}

/**
 * Correlation map: Which index to compare each ticker against
 */
const CORRELATION_MAP: { [ticker: string]: string } = {
  // Tech stocks → QQQ
  'NVDA': 'QQQ',
  'AAPL': 'QQQ',
  'MSFT': 'QQQ',
  'GOOGL': 'QQQ',
  'META': 'QQQ',
  'AMD': 'QQQ',
  'AMZN': 'QQQ',
  'NFLX': 'QQQ',

  // TSLA → XLY (Consumer Discretionary)
  'TSLA': 'XLY',

  // Financials → XLF
  'JPM': 'XLF',
  'BAC': 'XLF',
  'GS': 'XLF',
  'WFC': 'XLF',

  // Healthcare → XLV
  'UNH': 'XLV',
  'JNJ': 'XLV',
  'PFE': 'XLV',

  // Energy → XLE
  'XOM': 'XLE',
  'CVX': 'XLE',

  // Fallback to SPY for all others
};

/**
 * INSTITUTIONAL-GRADE CORRELATION CONFIRMATION
 *
 * Prevents divergence signals:
 * - NVDA call signal but QQQ falling → Penalize confidence
 * - AAPL put signal but QQQ rising → Penalize confidence
 *
 * Pillar Score (0-10 points):
 * - +10: Perfect confirmation (both moving same direction strongly)
 * - +5: Weak confirmation (both moving same direction, but weakly)
 * - 0: Neutral (index flat or mixed)
 * - -5: Divergence (ticker and index moving opposite directions)
 */
export async function analyzeCorrelation(
  ticker: string,
  signalDirection: 'CALL' | 'PUT'
): Promise<CorrelationData> {
  try {
    // 1. Determine which index to compare against
    const indexTicker = CORRELATION_MAP[ticker] || 'SPY';

    // 2. Get recent price movements for both ticker and index
    const [tickerMoves, indexMoves] = await Promise.all([
      getRecentPriceMovement(ticker),
      getRecentPriceMovement(indexTicker),
    ]);

    // 3. Determine directions
    const tickerDirection = determineDirection(tickerMoves);
    const indexDirection = determineDirection(indexMoves);

    // 4. Calculate correlation (simple: do they move together?)
    const correlation = calculateCorrelation(tickerMoves, indexMoves);

    // 5. Check if signal aligns with index
    const expectedTickerDirection = signalDirection === 'CALL' ? 'BULLISH' : 'BEARISH';
    const isConfirmed = checkConfirmation(expectedTickerDirection, indexDirection, correlation);

    // 6. Calculate pillar score
    const pillarScore = calculateCorrelationScore(
      expectedTickerDirection,
      tickerDirection,
      indexDirection,
      correlation
    );

    // 7. Generate recommendation
    const recommendation = generateCorrelationRecommendation(
      ticker,
      indexTicker,
      expectedTickerDirection,
      indexDirection,
      isConfirmed
    );

    return {
      isConfirmed,
      pillarScore,
      indexDirection,
      tickerDirection,
      correlation,
      recommendation,
    };

  } catch (error) {
    console.error(`[Correlation] Error analyzing correlation for ${ticker}:`, error);
    return {
      isConfirmed: false,
      pillarScore: 5, // Neutral
      indexDirection: 'NEUTRAL',
      tickerDirection: 'NEUTRAL',
      correlation: 0,
      recommendation: 'Unable to verify correlation',
    };
  }
}

/**
 * Get recent price movement (last 15 minutes of 1-min candles)
 */
async function getRecentPriceMovement(ticker: string): Promise<number[]> {
  const candles = await prisma.marketData.findMany({
    where: {
      ticker,
      timestamp: {
        gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
      },
    },
    orderBy: { timestamp: 'asc' },
    select: { close: true },
  });

  return candles.map((c: any) => c.close);
}

/**
 * Determine if prices are trending BULLISH, BEARISH, or NEUTRAL
 */
function determineDirection(prices: number[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (prices.length < 2) return 'NEUTRAL';

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (change > 0.2) return 'BULLISH'; // Up > 0.2%
  if (change < -0.2) return 'BEARISH'; // Down > 0.2%
  return 'NEUTRAL';
}

/**
 * Calculate simple correlation between two price series
 *
 * Returns -1 to 1:
 * - 1 = Perfect positive correlation (move together)
 * - -1 = Perfect negative correlation (move opposite)
 * - 0 = No correlation
 */
function calculateCorrelation(series1: number[], series2: number[]): number {
  if (series1.length === 0 || series2.length === 0) return 0;

  const minLength = Math.min(series1.length, series2.length);
  const s1 = series1.slice(-minLength);
  const s2 = series2.slice(-minLength);

  // Calculate returns
  const returns1 = s1.slice(1).map((price, i) => (price - s1[i]) / s1[i]);
  const returns2 = s2.slice(1).map((price, i) => (price - s2[i]) / s2[i]);

  if (returns1.length === 0) return 0;

  // Calculate means
  const mean1 = returns1.reduce((a: any, b: any) => a + b, 0) / returns1.length;
  const mean2 = returns2.reduce((a: any, b: any) => a + b, 0) / returns2.length;

  // Calculate correlation
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sumSq1 * sumSq2);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Check if signal is confirmed by index movement
 */
function checkConfirmation(
  expectedDirection: 'BULLISH' | 'BEARISH',
  indexDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  correlation: number
): boolean {
  // If index is neutral, don't penalize
  if (indexDirection === 'NEUTRAL') return true;

  // If expected direction matches index AND correlation is positive
  if (expectedDirection === indexDirection && correlation > 0.3) {
    return true;
  }

  return false;
}

/**
 * Calculate correlation pillar score (0-10 points)
 *
 * SCORING:
 * - Perfect confirmation (same direction, high correlation): +10
 * - Weak confirmation (same direction, low correlation): +7
 * - Neutral index: +5 (no boost or penalty)
 * - Divergence (opposite directions): 0-3 (PENALTY)
 */
function calculateCorrelationScore(
  expectedDirection: 'BULLISH' | 'BEARISH',
  tickerDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  indexDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  correlation: number
): number {
  // Perfect confirmation: expected direction matches both ticker and index, high correlation
  if (expectedDirection === tickerDirection &&
      expectedDirection === indexDirection &&
      correlation > 0.5) {
    return 10; // MAX SCORE
  }

  // Good confirmation: matches index, decent correlation
  if (expectedDirection === indexDirection && correlation > 0.3) {
    return 8;
  }

  // Weak confirmation: matches index but weak correlation
  if (expectedDirection === indexDirection) {
    return 7;
  }

  // Neutral index (no clear direction)
  if (indexDirection === 'NEUTRAL') {
    return 5;
  }

  // DIVERGENCE: Signal says CALL but index is BEARISH (or vice versa)
  if ((expectedDirection === 'BULLISH' && indexDirection === 'BEARISH') ||
      (expectedDirection === 'BEARISH' && indexDirection === 'BULLISH')) {
    return 2; // HEAVY PENALTY
  }

  return 5; // Default neutral
}

/**
 * Generate human-readable recommendation
 */
function generateCorrelationRecommendation(
  ticker: string,
  indexTicker: string,
  expectedDirection: 'BULLISH' | 'BEARISH',
  indexDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
  isConfirmed: boolean
): string {
  if (isConfirmed) {
    return `${indexTicker} confirms ${expectedDirection} signal for ${ticker}`;
  }

  if (indexDirection === 'NEUTRAL') {
    return `${indexTicker} neutral, signal not confirmed`;
  }

  return `⚠️ DIVERGENCE: ${ticker} signal ${expectedDirection} but ${indexTicker} is ${indexDirection}`;
}

/**
 * Bulk check correlations for multiple tickers
 */
export async function bulkCheckCorrelations(
  signals: Array<{ ticker: string; direction: 'CALL' | 'PUT' }>
): Promise<Map<string, CorrelationData>> {
  const results = new Map<string, CorrelationData>();

  await Promise.all(
    signals.map(async (signal) => {
      const correlation = await analyzeCorrelation(signal.ticker, signal.direction);
      results.set(signal.ticker, correlation);
    })
  );

  return results;
}
