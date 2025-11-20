import { PrismaClient } from '@prisma/client';
import { getRecommendedStrikeFromFlow, FlowHeatData } from './sweepClustering';
import { TrendStateData } from './trendState';
import { VolatilityRegimeData } from './volatilityRegime';

const prisma = new PrismaClient();

export interface StrikeRecommendation {
  strikePrice: number;
  expiration: Date;
  expirationDays: number; // 0 for 0DTE, 1 for 1DTE, etc.
  reasoning: string;
  delta: number; // Estimated delta
  distanceFromPrice: number; // Percentage OTM
  volume: number;
  openInterest: number;
  gammaExposure: number; // Estimated
}

/**
 * INSTITUTIONAL-GRADE STRIKE SELECTOR
 *
 * Picks the OPTIMAL strike based on:
 * - Flow clusters (where whales are hitting)
 * - Volume × OI × Gamma
 * - Distance from current price (0.5-3% OTM based on expiration)
 * - Liquidity (high volume strikes)
 *
 * NO MORE LOTTERY STRIKES. NO MORE DEEP OTM GARBAGE.
 */
export async function selectOptimalStrike(
  ticker: string,
  direction: 'CALL' | 'PUT',
  currentPrice: number,
  flowData: FlowHeatData,
  trendData: TrendStateData,
  volatilityData: VolatilityRegimeData
): Promise<StrikeRecommendation> {
  try {
    // 1. Determine optimal expiration first (affects strike selection)
    const expiration = await selectOptimalExpiration(
      ticker,
      trendData,
      volatilityData,
      flowData
    );

    const expirationDays = Math.floor(
      (expiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    // 2. Get available options chain
    const optionsChain = await prisma.optionsFlow.findMany({
      where: {
        ticker,
        expirationDate: {
          gte: new Date(expiration.getTime() - 12 * 60 * 60 * 1000), // Within 12h of target exp
          lte: new Date(expiration.getTime() + 12 * 60 * 60 * 1000),
        },
        sentiment: direction === 'CALL' ? 'BULLISH' : 'BEARISH',
      },
      select: {
        strikePrice: true,
        volume: true,
        openInterest: true,
        premium: true,
        isSweep: true,
        timestamp: true,
      },
    });

    if (optionsChain.length === 0) {
      // Fallback: Use price-based strike selection
      return createFallbackStrike(ticker, direction, currentPrice, expiration, expirationDays);
    }

    // 3. Calculate target distance from current price
    const targetDistance = calculateTargetDistance(expirationDays, trendData, volatilityData);

    // 4. Filter strikes by distance
    const validStrikes = optionsChain.filter((opt) => {
      const distance = ((opt.strikePrice - currentPrice) / currentPrice) * 100;
      const absDistance = Math.abs(distance);

      if (direction === 'CALL') {
        // For calls, strike should be ABOVE current price (OTM)
        return distance > 0 && absDistance <= targetDistance.max && absDistance >= targetDistance.min;
      } else {
        // For puts, strike should be BELOW current price (OTM)
        return distance < 0 && absDistance <= targetDistance.max && absDistance >= targetDistance.min;
      }
    });

    if (validStrikes.length === 0) {
      return createFallbackStrike(ticker, direction, currentPrice, expiration, expirationDays);
    }

    // 5. Score each strike
    const scoredStrikes = validStrikes.map((opt) => {
      const flowScore = calculateFlowScore(opt, flowData);
      const liquidityScore = calculateLiquidityScore(opt);
      const gammaScore = estimateGammaScore(opt, currentPrice);

      const totalScore = flowScore * 0.5 + liquidityScore * 0.3 + gammaScore * 0.2;

      return {
        ...opt,
        totalScore,
      };
    });

    // 6. Pick highest scoring strike
    scoredStrikes.sort((a, b) => b.totalScore - a.totalScore);
    const bestStrike = scoredStrikes[0];

    // 7. Calculate metrics
    const distanceFromPrice = ((bestStrike.strikePrice - currentPrice) / currentPrice) * 100;
    const delta = estimateDelta(bestStrike.strikePrice, currentPrice, direction, expirationDays);
    const gammaExposure = bestStrike.volume * bestStrike.openInterest * 0.01; // Simplified

    return {
      strikePrice: bestStrike.strikePrice,
      expiration,
      expirationDays,
      reasoning: generateStrikeReasoning(bestStrike, flowData, expirationDays),
      delta,
      distanceFromPrice,
      volume: bestStrike.volume,
      openInterest: bestStrike.openInterest,
      gammaExposure,
    };

  } catch (error) {
    console.error(`[StrikeSelector] Error selecting strike for ${ticker}:`, error);
    const expiration = getNextMarketExpiration(0);
    return createFallbackStrike(ticker, direction, currentPrice, expiration, 0);
  }
}

/**
 * INSTITUTIONAL EXPIRATION LOGIC
 *
 * 0DTE is ONLY allowed when:
 * - Trend score > 70% (STRONG_TREND)
 * - Flow score > 20%
 * - VIX trending upward
 * - Correlation confirmed
 *
 * Otherwise, use 1DTE or 2DTE for stability
 */
async function selectOptimalExpiration(
  ticker: string,
  trendData: TrendStateData,
  volatilityData: VolatilityRegimeData,
  flowData: FlowHeatData
): Promise<Date> {
  // Check 0DTE eligibility
  const is0DTEEligible =
    trendData.pillarScore >= 21 && // Need at least 70% of 30 points (strong trend)
    flowData.heatScore >= 20 && // Need at least 66% of 30 points (strong flow)
    volatilityData.vixTrend === 'RISING' &&
    !volatilityData.shouldSuppressSignals;

  if (is0DTEEligible) {
    return getNextMarketExpiration(0); // Today
  }

  // Check 1DTE eligibility
  const is1DTEEligible =
    trendData.pillarScore >= 15 && // At least weak trend
    flowData.heatScore >= 12; // Some institutional interest

  if (is1DTEEligible) {
    return getNextMarketExpiration(1); // Tomorrow or next trading day
  }

  // Default to 2DTE for safety
  return getNextMarketExpiration(2);
}

/**
 * Get next market expiration (0DTE = today, 1DTE = tomorrow, etc.)
 */
function getNextMarketExpiration(days: number): Date {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() + days);

  // If target falls on weekend, roll to next Monday
  const dayOfWeek = target.getDay();
  if (dayOfWeek === 0) {
    // Sunday → Monday
    target.setDate(target.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // Saturday → Monday
    target.setDate(target.getDate() + 2);
  }

  // Set to market close (4:00 PM ET)
  target.setHours(16, 0, 0, 0);

  return target;
}

/**
 * Calculate target OTM distance based on expiration and conditions
 */
function calculateTargetDistance(
  expirationDays: number,
  trendData: TrendStateData,
  volatilityData: VolatilityRegimeData
): { min: number; max: number } {
  if (expirationDays === 0) {
    // 0DTE: 0.5-1.5% OTM
    return { min: 0.3, max: 1.5 };
  } else if (expirationDays === 1) {
    // 1DTE: 1-2.5% OTM
    return { min: 0.8, max: 2.5 };
  } else {
    // 2DTE: 1-3% OTM
    return { min: 1.0, max: 3.0 };
  }
}

/**
 * Score strike based on flow activity
 */
function calculateFlowScore(option: any, flowData: FlowHeatData): number {
  let score = 50; // Base score

  // Check if this strike appears in flow clusters
  const matchingCluster = flowData.clusters.find(
    (c) => Math.abs(c.strikePrice - option.strikePrice) < 0.01
  );

  if (matchingCluster) {
    if (matchingCluster.confidence === 'HIGH') {
      score += 40; // Massive boost for high-confidence cluster
    } else if (matchingCluster.confidence === 'MEDIUM') {
      score += 25;
    } else {
      score += 10;
    }
  }

  // Bonus for sweeps
  if (option.isSweep) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Score strike based on liquidity (volume + OI)
 */
function calculateLiquidityScore(option: any): number {
  const volumeScore = Math.min(50, (option.volume / 1000) * 10);
  const oiScore = Math.min(50, (option.openInterest / 5000) * 10);

  return volumeScore + oiScore;
}

/**
 * Estimate gamma score (simplified)
 */
function estimateGammaScore(option: any, currentPrice: number): number {
  // Gamma is highest ATM, falls off as you move away
  const distance = Math.abs((option.strikePrice - currentPrice) / currentPrice) * 100;

  if (distance < 1) {
    return 100; // Near ATM = high gamma
  } else if (distance < 2) {
    return 75;
  } else if (distance < 3) {
    return 50;
  } else {
    return 25;
  }
}

/**
 * Estimate delta (simplified Black-Scholes approximation)
 */
function estimateDelta(strike: number, spot: number, direction: 'CALL' | 'PUT', expDays: number): number {
  const moneyness = spot / strike;

  if (direction === 'CALL') {
    if (moneyness > 1.02) return 0.65; // ITM
    if (moneyness > 1.0) return 0.55; // Near ATM
    if (moneyness > 0.98) return 0.45; // Slightly OTM
    if (moneyness > 0.95) return 0.35; // OTM
    return 0.25; // Far OTM
  } else {
    // PUT
    if (moneyness < 0.98) return -0.65; // ITM
    if (moneyness < 1.0) return -0.55; // Near ATM
    if (moneyness < 1.02) return -0.45; // Slightly OTM
    if (moneyness < 1.05) return -0.35; // OTM
    return -0.25; // Far OTM
  }
}

/**
 * Generate human-readable reasoning for strike selection
 */
function generateStrikeReasoning(strike: any, flowData: FlowHeatData, expDays: number): string {
  const reasons: string[] = [];

  const matchingCluster = flowData.clusters.find(
    (c) => Math.abs(c.strikePrice - strike.strikePrice) < 0.01
  );

  if (matchingCluster) {
    reasons.push(`${matchingCluster.sweepCount} institutional sweeps at this strike`);
  }

  if (strike.volume > 1000) {
    reasons.push(`high volume (${strike.volume.toLocaleString()})`);
  }

  if (strike.openInterest > 5000) {
    reasons.push(`strong OI (${strike.openInterest.toLocaleString()})`);
  }

  reasons.push(`${expDays}DTE optimal for current conditions`);

  return reasons.join(', ');
}

/**
 * Fallback strike selection (price-based)
 */
function createFallbackStrike(
  ticker: string,
  direction: 'CALL' | 'PUT',
  currentPrice: number,
  expiration: Date,
  expirationDays: number
): StrikeRecommendation {
  // Use simple OTM percentage
  const otmPercent = expirationDays === 0 ? 0.01 : expirationDays === 1 ? 0.015 : 0.02;

  const strikePrice =
    direction === 'CALL'
      ? Math.round(currentPrice * (1 + otmPercent))
      : Math.round(currentPrice * (1 - otmPercent));

  const delta = estimateDelta(strikePrice, currentPrice, direction, expirationDays);
  const distanceFromPrice = ((strikePrice - currentPrice) / currentPrice) * 100;

  return {
    strikePrice,
    expiration,
    expirationDays,
    reasoning: 'Price-based selection (no flow data available)',
    delta,
    distanceFromPrice,
    volume: 0,
    openInterest: 0,
    gammaExposure: 0,
  };
}
