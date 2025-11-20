import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ATRResult {
  atr1Min: number;
  atr5Min: number;
  atrNormalized: number; // as % of current price
  recommendedStop: number; // price level
  recommendedTarget0DTE: number; // 1.8x ATR
  recommendedTarget1DTE: number; // 2.5x ATR
}

/**
 * Calculate True Range for a single candle
 */
function calculateTrueRange(high: number, low: number, previousClose: number): number {
  const range1 = high - low;
  const range2 = Math.abs(high - previousClose);
  const range3 = Math.abs(low - previousClose);
  return Math.max(range1, range2, range3);
}

/**
 * Calculate ATR (Average True Range) from OHLC data
 *
 * @param candles - Array of OHLC candles, sorted chronologically (oldest first)
 * @param period - ATR period (default 14)
 * @returns ATR value
 */
export function calculateATR(candles: any[], period: number = 14): number {
  if (candles.length < period + 1) {
    throw new Error(`Not enough candles for ATR calculation. Need ${period + 1}, got ${candles.length}`);
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const tr = calculateTrueRange(
      candles[i].high,
      candles[i].low,
      candles[i - 1].close
    );
    trueRanges.push(tr);
  }

  // Calculate first ATR as simple average
  let atr = trueRanges.slice(0, period).reduce((a: any, b: any) => a + b, 0) / period;

  // Calculate smoothed ATR using Wilder's smoothing method
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * Fetch market data and calculate ATR with trade levels
 *
 * INSTITUTIONAL-GRADE STOPS AND TARGETS:
 * - Stop = Current Price - (1.5 × 1-min ATR)
 * - Target 0DTE = Current Price + (1.8 × 1-min ATR)
 * - Target 1DTE = Current Price + (2.5 × 1-min ATR)
 *
 * This ensures targets are ACTUALLY REACHABLE during the day
 */
export async function calculateATRForTicker(
  ticker: string,
  currentPrice: number
): Promise<ATRResult> {
  try {
    // Fetch 1-minute data (last 30 candles for 14-period ATR + buffer)
    const oneMinData = await prisma.marketData.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 45 * 60 * 1000), // Last 45 minutes
        },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        high: true,
        low: true,
        close: true,
        timestamp: true,
      },
    });

    // Fetch 5-minute data (aggregate from 1-min or use pre-aggregated if available)
    const fiveMinData = await prisma.marketData.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000), // Last 4 hours
        },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        high: true,
        low: true,
        close: true,
        timestamp: true,
      },
    });

    if (oneMinData.length < 15) {
      // Fallback to simple percentage-based levels if insufficient data
      console.warn(`[ATR] Insufficient 1-min data for ${ticker}, using fallback`);
      const fallbackATR = currentPrice * 0.005; // 0.5% of price
      return {
        atr1Min: fallbackATR,
        atr5Min: fallbackATR * 1.5,
        atrNormalized: 0.5,
        recommendedStop: currentPrice - (1.5 * fallbackATR),
        recommendedTarget0DTE: currentPrice + (1.8 * fallbackATR),
        recommendedTarget1DTE: currentPrice + (2.5 * fallbackATR),
      };
    }

    // Calculate 1-minute ATR
    const atr1Min = calculateATR(oneMinData, 14);

    // Calculate 5-minute ATR (if enough data)
    let atr5Min = atr1Min * 1.5; // Default fallback
    if (fiveMinData.length >= 15) {
      // Aggregate into 5-min buckets
      const fiveMinBuckets = aggregateTo5Min(fiveMinData);
      if (fiveMinBuckets.length >= 15) {
        atr5Min = calculateATR(fiveMinBuckets, 14);
      }
    }

    // Normalize ATR as percentage of current price
    const atrNormalized = (atr1Min / currentPrice) * 100;

    // Calculate institutional-grade stop and targets
    const recommendedStop = currentPrice - (1.5 * atr1Min);
    const recommendedTarget0DTE = currentPrice + (1.8 * atr1Min);
    const recommendedTarget1DTE = currentPrice + (2.5 * atr1Min);

    return {
      atr1Min,
      atr5Min,
      atrNormalized,
      recommendedStop,
      recommendedTarget0DTE,
      recommendedTarget1DTE,
    };

  } catch (error) {
    console.error(`[ATR] Error calculating ATR for ${ticker}:`, error);
    // Return safe fallback
    const fallbackATR = currentPrice * 0.005;
    return {
      atr1Min: fallbackATR,
      atr5Min: fallbackATR * 1.5,
      atrNormalized: 0.5,
      recommendedStop: currentPrice - (1.5 * fallbackATR),
      recommendedTarget0DTE: currentPrice + (1.8 * fallbackATR),
      recommendedTarget1DTE: currentPrice + (2.5 * fallbackATR),
    };
  }
}

/**
 * Aggregate 1-minute candles into 5-minute buckets
 */
function aggregateTo5Min(candles: any[]): any[] {
  const buckets: any[] = [];

  for (let i = 0; i < candles.length; i += 5) {
    const bucket = candles.slice(i, i + 5);
    if (bucket.length > 0) {
      buckets.push({
        high: Math.max(...bucket.map((c: any) => c.high)),
        low: Math.min(...bucket.map((c: any) => c.low)),
        close: bucket[bucket.length - 1].close,
        timestamp: bucket[0].timestamp,
      });
    }
  }

  return buckets;
}

/**
 * Calculate ATR-based stop and target for options contracts
 *
 * @param underlyingPrice - Current price of underlying
 * @param strikePrice - Option strike price
 * @param delta - Option delta (0-1 for calls, -1-0 for puts)
 * @param atr - ATR of underlying
 * @param expDays - 0 for 0DTE, 1 for 1DTE, etc.
 * @returns Stop and target as absolute price levels of the UNDERLYING
 */
export function calculateOptionsLevels(
  underlyingPrice: number,
  strikePrice: number,
  delta: number,
  atr: number,
  expDays: number
): { stopPrice: number; targetPrice: number } {

  // Use more conservative stops for 0DTE (tighter)
  const stopMultiplier = expDays === 0 ? 1.2 : 1.5;

  // Use more conservative targets for 0DTE (closer)
  const targetMultiplier = expDays === 0 ? 1.8 : 2.5;

  // Calculate underlying price levels
  const stopPrice = underlyingPrice - (stopMultiplier * atr);
  const targetPrice = underlyingPrice + (targetMultiplier * atr);

  return { stopPrice, targetPrice };
}
