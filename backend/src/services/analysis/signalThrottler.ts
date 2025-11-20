import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * INSTITUTIONAL-GRADE SIGNAL THROTTLER
 *
 * Prevents signal spam by enforcing strict limits:
 * - Max 1 signal per ticker per 30 minutes
 * - Max 6 signals per hour globally
 * - Max 3 signals per ticker per day
 *
 * This transforms the engine from "50 garbage signals" → "3-5 ultra-high quality signals"
 */

// In-memory cache for recent signals (faster than DB queries)
const recentSignalsCache = new Map<string, Date[]>();
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean cache every 5 minutes

// Auto-cleanup old cache entries
setInterval(() => {
  const now = Date.now();
  for (const [ticker, timestamps] of recentSignalsCache.entries()) {
    // Remove timestamps older than 1 day
    const filtered = timestamps.filter((ts) => now - ts.getTime() < 24 * 60 * 60 * 1000);
    if (filtered.length === 0) {
      recentSignalsCache.delete(ticker);
    } else {
      recentSignalsCache.set(ticker, filtered);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

export interface ThrottleResult {
  allowed: boolean;
  reason: string;
  nextAllowedTime?: Date;
  tickerSignalsToday: number;
  globalSignalsThisHour: number;
}

/**
 * Check if a signal should be allowed based on throttling rules
 */
export async function checkSignalThrottle(ticker: string): Promise<ThrottleResult> {
  try {
    const now = new Date();

    // 1. Check ticker-specific limits
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check database for recent signals
    const [recentTickerSignals, todayTickerSignals] = await Promise.all([
      // Signals for this ticker in last 30 minutes
      prisma.signal.count({
        where: {
          ticker,
          createdAt: { gte: thirtyMinutesAgo },
        },
      }),
      // Signals for this ticker today
      prisma.signal.count({
        where: {
          ticker,
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    // RULE 1: Max 1 signal per ticker per 30 minutes
    if (recentTickerSignals >= 1) {
      const lastSignal = await prisma.signal.findFirst({
        where: { ticker },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const nextAllowedTime = lastSignal
        ? new Date(lastSignal.createdAt.getTime() + 30 * 60 * 1000)
        : new Date(now.getTime() + 30 * 60 * 1000);

      return {
        allowed: false,
        reason: `Ticker ${ticker} already has a signal in the last 30 minutes`,
        nextAllowedTime,
        tickerSignalsToday: todayTickerSignals,
        globalSignalsThisHour: 0,
      };
    }

    // RULE 2: Max 3 signals per ticker per day
    if (todayTickerSignals >= 3) {
      return {
        allowed: false,
        reason: `Ticker ${ticker} has reached daily limit of 3 signals`,
        tickerSignalsToday: todayTickerSignals,
        globalSignalsThisHour: 0,
      };
    }

    // 2. Check global limits
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const globalSignalsThisHour = await prisma.signal.count({
      where: {
        createdAt: { gte: oneHourAgo },
      },
    });

    // RULE 3: Max 6 signals per hour globally
    if (globalSignalsThisHour >= 6) {
      return {
        allowed: false,
        reason: 'Global hourly limit reached (6 signals per hour)',
        tickerSignalsToday: todayTickerSignals,
        globalSignalsThisHour,
      };
    }

    // All checks passed, signal is allowed
    return {
      allowed: true,
      reason: 'Signal allowed',
      tickerSignalsToday: todayTickerSignals,
      globalSignalsThisHour,
    };

  } catch (error) {
    console.error(`[Throttler] Error checking throttle for ${ticker}:`, error);
    // On error, deny signal to be safe
    return {
      allowed: false,
      reason: 'Error checking throttle limits',
      tickerSignalsToday: 0,
      globalSignalsThisHour: 0,
    };
  }
}

/**
 * Record a signal in the cache (for faster subsequent checks)
 */
export function recordSignalInCache(ticker: string): void {
  const now = new Date();

  if (!recentSignalsCache.has(ticker)) {
    recentSignalsCache.set(ticker, []);
  }

  const timestamps = recentSignalsCache.get(ticker)!;
  timestamps.push(now);

  // Keep only last 24 hours in cache
  const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const filtered = timestamps.filter((ts) => ts.getTime() > oneDayAgo);
  recentSignalsCache.set(ticker, filtered);
}

/**
 * Get signal statistics for monitoring
 */
export async function getSignalStatistics(): Promise<{
  signalsLast30Min: number;
  signalsLastHour: number;
  signalsToday: number;
  topTickersToday: Array<{ ticker: string; count: number }>;
}> {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [signalsLast30Min, signalsLastHour, signalsToday, topTickers] = await Promise.all([
      prisma.signal.count({ where: { createdAt: { gte: thirtyMinutesAgo } } }),
      prisma.signal.count({ where: { createdAt: { gte: oneHourAgo } } }),
      prisma.signal.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.signal.groupBy({
        by: ['ticker'],
        where: { createdAt: { gte: oneDayAgo } },
        _count: { ticker: true },
        orderBy: { _count: { ticker: 'desc' } },
        take: 10,
      }),
    ]);

    const topTickersToday = topTickers.map((t) => ({
      ticker: t.ticker,
      count: t._count.ticker,
    }));

    return {
      signalsLast30Min,
      signalsLastHour,
      signalsToday,
      topTickersToday,
    };

  } catch (error) {
    console.error('[Throttler] Error getting signal statistics:', error);
    return {
      signalsLast30Min: 0,
      signalsLastHour: 0,
      signalsToday: 0,
      topTickersToday: [],
    };
  }
}

/**
 * Priority queue for queued signals
 *
 * If throttle limits are hit, signals can be queued
 * and emitted later when slots become available
 */
const signalQueue: Array<{
  ticker: string;
  confidence: number;
  timestamp: Date;
  metadata: any;
}> = [];

/**
 * Add signal to priority queue
 */
export function queueSignal(ticker: string, confidence: number, metadata: any): void {
  signalQueue.push({
    ticker,
    confidence,
    timestamp: new Date(),
    metadata,
  });

  // Sort by confidence (highest first)
  signalQueue.sort((a, b) => b.confidence - a.confidence);

  // Keep only top 20 queued signals
  if (signalQueue.length > 20) {
    signalQueue.splice(20);
  }
}

/**
 * Get next queued signal (highest confidence)
 */
export function getNextQueuedSignal(): any | null {
  if (signalQueue.length === 0) return null;

  // Remove stale signals (older than 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const validSignals = signalQueue.filter((s) => s.timestamp >= tenMinutesAgo);

  if (validSignals.length === 0) {
    signalQueue.length = 0; // Clear queue
    return null;
  }

  // Return highest confidence signal
  return signalQueue.shift();
}

/**
 * Clear signal queue
 */
export function clearSignalQueue(): void {
  signalQueue.length = 0;
}
