interface RiskMetrics {
  positionRisk: number;
  portfolioRisk: number;
  maxPositionSize: number;
  suggestedQuantity: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  warnings: string[];
}

export function calculateRiskMetrics(
  accountSize: number,
  entryPrice: number,
  stopLoss: number,
  targetPrice: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive',
  volatilityRegime: string
): RiskMetrics {
  // Risk tolerance multipliers
  const toleranceMultipliers = {
    conservative: 0.01, // 1% max risk per trade
    moderate: 0.02,     // 2% max risk per trade
    aggressive: 0.03    // 3% max risk per trade
  };

  const riskPerTrade = toleranceMultipliers[riskTolerance];
  const maxRiskAmount = accountSize * riskPerTrade;
  const riskPerContract = entryPrice - stopLoss;

  // Calculate position sizing
  const maxPositionSize = riskPerContract > 0
    ? Math.floor(maxRiskAmount / riskPerContract)
    : 1;

  // Adjust for volatility
  let suggestedQuantity = maxPositionSize;
  if (volatilityRegime === 'EXTREME') {
    suggestedQuantity = Math.max(1, Math.floor(maxPositionSize * 0.5));
  } else if (volatilityRegime === 'HIGH') {
    suggestedQuantity = Math.max(1, Math.floor(maxPositionSize * 0.7));
  }

  // Calculate position risk
  const positionRisk = (riskPerContract * suggestedQuantity / accountSize) * 100;

  // Estimate portfolio risk (simplified)
  const portfolioRisk = positionRisk * 1.5; // Account for correlated positions

  // Mock Greeks (in production, calculate from options model)
  const greeks = {
    delta: 0.45 + Math.random() * 0.2,
    gamma: 0.05 + Math.random() * 0.05,
    theta: -(0.1 + Math.random() * 0.2),
    vega: 0.2 + Math.random() * 0.3
  };

  // Generate warnings
  const warnings: string[] = [];

  if (positionRisk > 3) {
    warnings.push('Position risk exceeds 3% of account. Consider reducing size.');
  }

  if (volatilityRegime === 'EXTREME') {
    warnings.push('EXTREME volatility detected. Use caution and wider stops.');
  }

  if (volatilityRegime === 'HIGH') {
    warnings.push('High volatility environment. Consider spread strategies.');
  }

  if (greeks.theta < -0.2) {
    warnings.push('High theta decay. Time is working against this position.');
  }

  const riskReward = (targetPrice - entryPrice) / riskPerContract;
  if (riskReward < 1.5) {
    warnings.push('Risk/reward ratio below 1.5:1. Consider different strike or expiration.');
  }

  return {
    positionRisk,
    portfolioRisk,
    maxPositionSize,
    suggestedQuantity,
    greeks,
    warnings
  };
}

export function getPositionSizeRecommendation(
  accountSize: number,
  riskTolerance: string,
  signalConfidence: number
): string {
  const baseAllocation = {
    conservative: 0.02,
    moderate: 0.05,
    aggressive: 0.10
  };

  const base = baseAllocation[riskTolerance as keyof typeof baseAllocation] || 0.05;
  const confidenceAdjustment = (signalConfidence - 50) / 100 * 0.5;
  const allocation = Math.max(0.01, Math.min(0.15, base + confidenceAdjustment));

  const positionSize = accountSize * allocation;

  if (positionSize < 100) {
    return 'Minimum position size of $100 recommended.';
  }

  return `Suggested position size: $${positionSize.toFixed(0)} (${(allocation * 100).toFixed(1)}% of account)`;
}
