/**
 * INSTITUTIONAL-GRADE 5-PILLAR CONFIDENCE SCORING SYSTEM
 *
 * This is the CORE of the new signal engine.
 * Each pillar is independently calculated and weighted:
 *
 * Pillar 1: Trend State (30%)
 * Pillar 2: Options Flow Heat (30%)
 * Pillar 3: Volatility Conditions (20%)
 * Pillar 4: Liquidity & Structure (10%)
 * Pillar 5: Cross-Ticker Confirmation (10%)
 *
 * Total: 100 points = 100% confidence
 *
 * MINIMUM THRESHOLD: 65% confidence required to fire signal
 */

import { analyzeTrendState, TrendStateData } from './trendState';
import { analyzeFlowHeat, FlowHeatData } from './sweepClustering';
import { analyzeVolatilityRegime, VolatilityRegimeData } from './volatilityRegime';
import { analyzeCorrelation, CorrelationData } from './correlationEngine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface InstitutionalScore {
  totalConfidence: number; // 0-100
  pillar1_trendState: number; // 0-30
  pillar2_flowHeat: number; // 0-30
  pillar3_volatility: number; // 0-20
  pillar4_liquidity: number; // 0-10
  pillar5_correlation: number; // 0-10
  meetsThreshold: boolean; // True if >= 65%
  recommendation: string;
  details: {
    trend: TrendStateData;
    flow: FlowHeatData;
    volatility: VolatilityRegimeData;
    correlation: CorrelationData;
  };
}

/**
 * Calculate institutional-grade confidence score
 */
export async function calculateInstitutionalScore(
  ticker: string,
  direction: 'CALL' | 'PUT',
  currentPrice: number
): Promise<InstitutionalScore> {
  try {
    // Run all 5 pillars in parallel for speed
    const [trend, flow, volatility, correlation, liquidity] = await Promise.all([
      analyzeTrendState(ticker), // Pillar 1: Trend State (30%)
      analyzeFlowHeat(ticker), // Pillar 2: Options Flow Heat (30%)
      analyzeVolatilityRegime(ticker), // Pillar 3: Volatility Conditions (20%)
      analyzeCorrelation(ticker, direction), // Pillar 5: Cross-Ticker Confirmation (10%)
      analyzeLiquidity(ticker, currentPrice), // Pillar 4: Liquidity & Structure (10%)
    ]);

    // Extract pillar scores
    const pillar1_trendState = trend.pillarScore; // 0-30
    const pillar2_flowHeat = flow.heatScore; // 0-30
    const pillar3_volatility = volatility.pillarScore; // 0-20
    const pillar4_liquidity = liquidity; // 0-10
    const pillar5_correlation = correlation.pillarScore; // 0-10

    // Calculate total confidence
    let totalConfidence =
      pillar1_trendState +
      pillar2_flowHeat +
      pillar3_volatility +
      pillar4_liquidity +
      pillar5_correlation;

    // Apply confidence cap from volatility regime
    if (volatility.confidenceCap < 100) {
      totalConfidence = Math.min(totalConfidence, volatility.confidenceCap);
    }

    // Ensure within bounds
    totalConfidence = Math.max(0, Math.min(100, totalConfidence));

    // Check if meets institutional threshold (65%)
    const meetsThreshold = totalConfidence >= 65;

    // Generate recommendation
    const recommendation = generateInstitutionalRecommendation(
      totalConfidence,
      meetsThreshold,
      trend,
      flow,
      volatility,
      correlation
    );

    return {
      totalConfidence,
      pillar1_trendState,
      pillar2_flowHeat,
      pillar3_volatility,
      pillar4_liquidity,
      pillar5_correlation,
      meetsThreshold,
      recommendation,
      details: {
        trend,
        flow,
        volatility,
        correlation,
      },
    };

  } catch (error) {
    console.error(`[InstitutionalScorer] Error calculating score for ${ticker}:`, error);
    return createFailsafeScore();
  }
}

/**
 * Pillar 4: Liquidity & Structure Analysis
 *
 * Scores based on:
 * - VWAP alignment
 * - Volume profile
 * - Key support/resistance levels
 *
 * Returns 0-10 points
 */
async function analyzeLiquidity(ticker: string, currentPrice: number): Promise<number> {
  try {
    // Get latest market data
    const marketData = await prisma.marketData.findFirst({
      where: { ticker },
      orderBy: { timestamp: 'desc' },
      select: {
        vwap: true,
        volume: true,
        high: true,
        low: true,
        close: true,
      },
    });

    if (!marketData || !marketData.vwap) {
      return 5; // Neutral score if no data
    }

    let score = 5; // Start at neutral

    // Check VWAP alignment
    const vwapDistance = Math.abs(currentPrice - marketData.vwap) / currentPrice;

    if (vwapDistance < 0.002) {
      // Price within 0.2% of VWAP = strong liquidity
      score += 3;
    } else if (vwapDistance < 0.005) {
      // Price within 0.5% of VWAP = decent liquidity
      score += 2;
    } else if (vwapDistance > 0.01) {
      // Price far from VWAP = weak liquidity
      score -= 2;
    }

    // Check if price is near key levels (simplified: high/low of day)
    const distanceToHigh = Math.abs(currentPrice - marketData.high) / currentPrice;
    const distanceToLow = Math.abs(currentPrice - marketData.low) / currentPrice;

    if (distanceToHigh < 0.003 || distanceToLow < 0.003) {
      // Near key level = potential bounce/rejection
      score += 2;
    }

    // Ensure within bounds
    return Math.max(0, Math.min(10, score));

  } catch (error) {
    console.error(`[Liquidity] Error analyzing liquidity for ${ticker}:`, error);
    return 5; // Neutral score on error
  }
}

/**
 * Generate comprehensive recommendation based on all pillars
 */
function generateInstitutionalRecommendation(
  confidence: number,
  meetsThreshold: boolean,
  trend: TrendStateData,
  flow: FlowHeatData,
  volatility: VolatilityRegimeData,
  correlation: CorrelationData
): string {
  if (!meetsThreshold) {
    // Identify why signal failed
    const reasons: string[] = [];

    if (trend.pillarScore < 15) {
      reasons.push(`weak trend (${trend.state})`);
    }
    if (flow.heatScore < 15) {
      reasons.push('insufficient institutional flow');
    }
    if (volatility.shouldSuppressSignals) {
      reasons.push(`${volatility.marketState} market conditions`);
    }
    if (!correlation.isConfirmed) {
      reasons.push('index divergence');
    }

    return `❌ REJECTED: ${reasons.join(', ')}. Confidence ${confidence}% (need 65%+)`;
  }

  // Signal meets threshold
  if (confidence >= 85) {
    return `✅ PREMIUM SIGNAL (${confidence}%): All pillars aligned, strong institutional conviction`;
  }

  if (confidence >= 75) {
    return `✅ STRONG SIGNAL (${confidence}%): ${trend.state} + ${flow.netSentiment} flow heat`;
  }

  return `✅ VALID SIGNAL (${confidence}%): Meets threshold, proceed with caution`;
}

/**
 * Failsafe score returned on errors
 */
function createFailsafeScore(): InstitutionalScore {
  return {
    totalConfidence: 0,
    pillar1_trendState: 0,
    pillar2_flowHeat: 0,
    pillar3_volatility: 0,
    pillar4_liquidity: 0,
    pillar5_correlation: 0,
    meetsThreshold: false,
    recommendation: 'Error calculating institutional score',
    details: {
      trend: {
        state: 'CHOP',
        direction: 'NEUTRAL',
        pillarScore: 0,
        ema1: 0,
        ema5: 0,
        emaSeparation: 0,
        rsi: 50,
        macd: 0,
        macdSignal: 0,
        macdHistogram: 0,
        shouldSuppress: true,
        recommendation: 'Error',
      },
      flow: {
        hasHeat: false,
        heatScore: 0,
        clusters: [],
        largestSweep: 0,
        totalBullishPremium: 0,
        totalBearishPremium: 0,
        netSentiment: 'NEUTRAL',
        recommendation: 'Error',
      },
      volatility: {
        regime: 'MEDIUM',
        marketState: 'CHOP',
        vix: 15,
        vixTrend: 'FLAT',
        rvol: 1.0,
        confidenceCap: 0,
        shouldSuppressSignals: true,
        pillarScore: 0,
      },
      correlation: {
        isConfirmed: false,
        pillarScore: 0,
        indexDirection: 'NEUTRAL',
        tickerDirection: 'NEUTRAL',
        correlation: 0,
        recommendation: 'Error',
      },
    },
  };
}

/**
 * Quick pre-check: Should signal even be evaluated?
 *
 * Fast checks before running expensive analysis:
 * - Throttle limits
 * - Market hours
 * - Basic price sanity checks
 */
export async function preCheckSignalEligibility(
  ticker: string
): Promise<{ eligible: boolean; reason: string }> {
  // Check if market is open (9:30 AM - 4:00 PM ET)
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const dayOfWeek = et.getDay();

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { eligible: false, reason: 'Market closed (weekend)' };
  }

  // Market hours check (9:30 AM - 4:00 PM ET)
  if (hours < 9 || (hours === 9 && minutes < 30) || hours >= 16) {
    return { eligible: false, reason: 'Outside market hours' };
  }

  // Check if ticker has recent price data
  const recentData = await prisma.marketData.findFirst({
    where: {
      ticker,
      timestamp: {
        gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
      },
    },
  });

  if (!recentData) {
    return { eligible: false, reason: 'No recent market data' };
  }

  return { eligible: true, reason: 'Eligible for analysis' };
}
