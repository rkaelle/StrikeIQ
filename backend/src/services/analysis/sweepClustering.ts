import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SweepCluster {
  direction: 'BULLISH' | 'BEARISH';
  strikePrice: number;
  expiration: Date;
  totalPremium: number;
  sweepCount: number;
  avgSweepSize: number;
  timeWindow: number; // seconds
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FlowHeatData {
  hasHeat: boolean;
  heatScore: number; // 0-30 for the Options Flow Heat pillar
  clusters: SweepCluster[];
  largestSweep: number;
  totalBullishPremium: number;
  totalBearishPremium: number;
  netSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  recommendation: string;
}

/**
 * INSTITUTIONAL-GRADE SWEEP CLUSTERING ENGINE
 *
 * Real flow heat comes from CONCENTRATED BURSTS:
 * - Multiple sweeps hitting the SAME strike within 90 seconds
 * - Individual sweeps > $500k
 * - 3+ whales hitting same direction
 *
 * This is NOT "any flow = signal" — it's "whale clusters = signal"
 */
export async function analyzeFlowHeat(
  ticker: string,
  timeWindowMinutes: number = 120 // Look back 2 hours
): Promise<FlowHeatData> {
  try {
    // 1. Fetch recent options flow
    const flows = await prisma.optionsFlow.findMany({
      where: {
        ticker,
        timestamp: {
          gte: new Date(Date.now() - timeWindowMinutes * 60 * 1000),
        },
      },
      orderBy: { timestamp: 'desc' },
      select: {
        strikePrice: true,
        expirationDate: true,
        premium: true,
        isSweep: true,
        isBlock: true,
        sentiment: true,
        timestamp: true,
        volume: true,
        openInterest: true,
      },
    });

    if (flows.length === 0) {
      return {
        hasHeat: false,
        heatScore: 0,
        clusters: [],
        largestSweep: 0,
        totalBullishPremium: 0,
        totalBearishPremium: 0,
        netSentiment: 'NEUTRAL',
        recommendation: 'No flow detected',
      };
    }

    // 2. Filter for sweeps and blocks only (institutional activity)
    const institutionalFlows = flows.filter((f: any) => f.isSweep || f.isBlock);

    // 3. Separate by sentiment
    const bullishFlows = institutionalFlows.filter((f: any) => f.sentiment === 'BULLISH');
    const bearishFlows = institutionalFlows.filter((f: any) => f.sentiment === 'BEARISH');

    const totalBullishPremium = bullishFlows.reduce((sum: any, f: any) => sum + f.premium, 0);
    const totalBearishPremium = bearishFlows.reduce((sum: any, f: any) => sum + f.premium, 0);

    // 4. Find largest single sweep
    const largestSweep = Math.max(...institutionalFlows.map((f: any) => f.premium), 0);

    // 5. Detect sweep clusters (same strike + expiration within 90 seconds)
    const clusters = detectSweepClusters(institutionalFlows);

    // 6. Calculate flow heat score (0-30 points)
    const heatScore = calculateFlowHeatScore(
      clusters,
      largestSweep,
      totalBullishPremium,
      totalBearishPremium,
      institutionalFlows.length
    );

    // 7. Determine net sentiment
    const netSentiment = determineNetSentiment(totalBullishPremium, totalBearishPremium);

    // 8. Generate recommendation
    const recommendation = generateFlowRecommendation(clusters, heatScore, netSentiment);

    return {
      hasHeat: heatScore >= 15, // Need at least 50% of max score to qualify as "heat"
      heatScore,
      clusters,
      largestSweep,
      totalBullishPremium,
      totalBearishPremium,
      netSentiment,
      recommendation,
    };

  } catch (error) {
    console.error(`[FlowHeat] Error analyzing flow heat for ${ticker}:`, error);
    return {
      hasHeat: false,
      heatScore: 0,
      clusters: [],
      largestSweep: 0,
      totalBullishPremium: 0,
      totalBearishPremium: 0,
      netSentiment: 'NEUTRAL',
      recommendation: 'Error analyzing flow',
    };
  }
}

/**
 * Detect clusters: Multiple sweeps hitting same strike+exp within 90 seconds
 */
function detectSweepClusters(flows: any[]): SweepCluster[] {
  const clusters: SweepCluster[] = [];
  const clusterWindow = 90 * 1000; // 90 seconds in milliseconds

  // Group by strike + expiration
  const grouped = new Map<string, any[]>();

  for (const flow of flows) {
    const key = `${flow.strikePrice}-${flow.expirationDate.toISOString()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(flow);
  }

  // For each group, find time clusters
  for (const [key, groupFlows] of grouped.entries()) {
    if (groupFlows.length < 2) continue; // Need at least 2 sweeps to form a cluster

    // Sort by timestamp
    groupFlows.sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());

    let clusterStart = 0;
    for (let i = 1; i < groupFlows.length; i++) {
      const timeDiff = groupFlows[i].timestamp.getTime() - groupFlows[clusterStart].timestamp.getTime();

      // If within cluster window, continue
      if (timeDiff <= clusterWindow) {
        // Check if this is the last flow or next flow is outside window
        if (i === groupFlows.length - 1 ||
            groupFlows[i + 1].timestamp.getTime() - groupFlows[clusterStart].timestamp.getTime() > clusterWindow) {

          // Form a cluster
          const clusterFlows = groupFlows.slice(clusterStart, i + 1);
          const totalPremium = clusterFlows.reduce((sum: any, f: any) => sum + f.premium, 0);
          const avgSweepSize = totalPremium / clusterFlows.length;

          // Determine dominant direction
          const bullishCount = clusterFlows.filter((f) => f.sentiment === 'BULLISH').length;
          const bearishCount = clusterFlows.filter((f) => f.sentiment === 'BEARISH').length;
          const direction = bullishCount > bearishCount ? 'BULLISH' : 'BEARISH';

          // Determine confidence based on sweep size and count
          let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
          if (clusterFlows.length >= 3 && avgSweepSize > 500000) {
            confidence = 'HIGH';
          } else if (clusterFlows.length >= 2 && avgSweepSize > 250000) {
            confidence = 'MEDIUM';
          }

          clusters.push({
            direction,
            strikePrice: clusterFlows[0].strikePrice,
            expiration: clusterFlows[0].expirationDate,
            totalPremium,
            sweepCount: clusterFlows.length,
            avgSweepSize,
            timeWindow: timeDiff / 1000, // Convert to seconds
            confidence,
          });

          clusterStart = i + 1; // Start new potential cluster
        }
      } else {
        // Outside window, reset cluster start
        clusterStart = i;
      }
    }
  }

  // Sort clusters by total premium (largest first)
  clusters.sort((a: any, b: any) => b.totalPremium - a.totalPremium);

  return clusters;
}

/**
 * Calculate flow heat score (0-30 points for the pillar)
 *
 * SCORING RULES:
 * +15 points: Sweep > $500k
 * +10 points: 3+ sweeps same direction within 2 minutes
 * +5 points: High-confidence cluster detected
 */
function calculateFlowHeatScore(
  clusters: SweepCluster[],
  largestSweep: number,
  totalBullishPremium: number,
  totalBearishPremium: number,
  totalFlowCount: number
): number {
  let score = 0;

  // Bonus for large single sweeps
  if (largestSweep > 1000000) {
    score += 15; // $1M+ sweep = max points
  } else if (largestSweep > 500000) {
    score += 12; // $500k+ sweep
  } else if (largestSweep > 250000) {
    score += 7; // $250k+ sweep
  }

  // Bonus for high-confidence clusters
  const highConfClusters = clusters.filter((c) => c.confidence === 'HIGH');
  if (highConfClusters.length > 0) {
    score += 10; // Multiple whales hitting same strike
  }

  // Bonus for repeated activity (3+ sweeps within 120 seconds)
  const rapidClusters = clusters.filter((c) => c.sweepCount >= 3 && c.timeWindow <= 120);
  if (rapidClusters.length > 0) {
    score += 5; // Rapid-fire institutional activity
  }

  // Cap at 30
  return Math.min(score, 30);
}

/**
 * Determine net sentiment from premium flows
 */
function determineNetSentiment(
  bullishPremium: number,
  bearishPremium: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const total = bullishPremium + bearishPremium;
  if (total === 0) return 'NEUTRAL';

  const bullishRatio = bullishPremium / total;

  if (bullishRatio > 0.65) return 'BULLISH';
  if (bullishRatio < 0.35) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Generate human-readable recommendation
 */
function generateFlowRecommendation(
  clusters: SweepCluster[],
  heatScore: number,
  netSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
): string {
  if (heatScore < 10) {
    return 'Weak flow activity, no clear institutional interest';
  }

  if (heatScore >= 25) {
    const topCluster = clusters[0];
    return `STRONG ${netSentiment} flow heat detected. ${topCluster?.sweepCount || 0} sweeps at $${topCluster?.strikePrice || 0} strike within ${topCluster?.timeWindow || 0}s`;
  }

  if (heatScore >= 15) {
    return `Moderate ${netSentiment} institutional activity detected`;
  }

  return `Some ${netSentiment} flow activity, watch for confirmation`;
}

/**
 * Get recommended strike from flow clusters
 *
 * Returns the strike with the most institutional activity
 */
export function getRecommendedStrikeFromFlow(clusters: SweepCluster[], direction: 'CALL' | 'PUT'): number | null {
  if (clusters.length === 0) return null;

  const sentiment = direction === 'CALL' ? 'BULLISH' : 'BEARISH';
  const matchingClusters = clusters.filter((c) => c.direction === sentiment);

  if (matchingClusters.length === 0) return null;

  // Return the strike with highest total premium
  return matchingClusters[0].strikePrice;
}
