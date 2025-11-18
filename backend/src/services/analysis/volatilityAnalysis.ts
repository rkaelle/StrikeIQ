import axios from 'axios';

interface VolatilityAnalysisResult {
  score: number;
  vix: number;
  impliedVolatility: number;
  historicalVolatility: number;
  ivRank: number;
  ivPercentile: number;
  regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME';
  recommendation: string;
}

export async function analyzeVolatility(ticker: string): Promise<VolatilityAnalysisResult> {
  try {
    // In production, fetch real VIX and IV data
    // const vixResponse = await axios.get('...');

    // Mock data for development
    const vix = 15 + Math.random() * 20; // VIX between 15-35
    const impliedVolatility = 20 + Math.random() * 40; // IV between 20-60%
    const historicalVolatility = 15 + Math.random() * 30; // HV between 15-45%

    // Calculate IV Rank (where current IV sits in 52-week range)
    const ivRank = Math.random() * 100;

    // Calculate IV Percentile
    const ivPercentile = Math.random() * 100;

    // Determine volatility regime
    let regime: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME' = 'NORMAL';
    if (vix < 15) {
      regime = 'LOW';
    } else if (vix < 20) {
      regime = 'NORMAL';
    } else if (vix < 25) {
      regime = 'ELEVATED';
    } else if (vix < 30) {
      regime = 'HIGH';
    } else {
      regime = 'EXTREME';
    }

    // Calculate score
    // Higher score = more favorable conditions for options trading
    let score = 50;

    // VIX impact
    if (vix > 20 && vix < 30) {
      score += 20; // Good premium environment
    } else if (vix >= 30) {
      score -= 10; // Too volatile, risky
    } else if (vix < 15) {
      score += 10; // Low premium but stable
    }

    // IV vs HV comparison
    if (impliedVolatility > historicalVolatility * 1.2) {
      score += 15; // IV elevated, good for selling premium
    } else if (impliedVolatility < historicalVolatility * 0.8) {
      score -= 5; // IV compressed
    }

    // IV Rank impact
    if (ivRank > 50) {
      score += 10; // IV above median
    }

    score = Math.max(0, Math.min(100, score));

    // Generate recommendation
    let recommendation = '';
    if (regime === 'EXTREME') {
      recommendation = 'CAUTION: Extreme volatility. Reduce position sizes and use wider stops.';
    } else if (regime === 'HIGH') {
      recommendation = 'High volatility environment. Consider selling premium or using spreads.';
    } else if (regime === 'ELEVATED') {
      recommendation = 'Elevated volatility. Good environment for premium collection.';
    } else if (regime === 'NORMAL') {
      recommendation = 'Normal volatility. Standard position sizing appropriate.';
    } else {
      recommendation = 'Low volatility. Consider buying premium for directional plays.';
    }

    return {
      score,
      vix,
      impliedVolatility,
      historicalVolatility,
      ivRank,
      ivPercentile,
      regime,
      recommendation
    };
  } catch (error) {
    console.error(`Volatility analysis error for ${ticker}:`, error);
    return {
      score: 50,
      vix: 20,
      impliedVolatility: 30,
      historicalVolatility: 25,
      ivRank: 50,
      ivPercentile: 50,
      regime: 'NORMAL',
      recommendation: 'Unable to analyze volatility. Use caution.'
    };
  }
}

export async function getVIXData(): Promise<{ current: number; change: number; high: number; low: number }> {
  // In production, fetch from API
  return {
    current: 18.5,
    change: -0.5,
    high: 22.3,
    low: 16.8
  };
}
