/**
 * ==========================================
 * INSTITUTIONAL-GRADE SIGNAL ENGINE V2.0
 * ==========================================
 *
 * This engine transforms StrikeIQ from "random coin flips" to
 * a professional-grade institutional signal system.
 *
 * KEY IMPROVEMENTS:
 * ✅ 5-Pillar Confidence Scoring (Trend, Flow, Volatility, Liquidity, Correlation)
 * ✅ ATR-Based Stops and Targets (actually reachable)
 * ✅ Signal Throttling (max 6/hour, 1 per ticker per 30min)
 * ✅ Chop Suppression (80% suppression during sideways markets)
 * ✅ Smart Expiration (0DTE only in trending markets)
 * ✅ Strike Selection (gamma + sweeps + liquidity)
 * ✅ News Filtering (real catalysts only)
 * ✅ Correlation Confirmation (prevent divergence signals)
 *
 * MINIMUM THRESHOLD: 65% confidence required
 */

import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import cron from 'node-cron';
import { calculateInstitutionalScore, preCheckSignalEligibility } from './analysis/institutionalScorer';
import { checkSignalThrottle, recordSignalInCache, getSignalStatistics } from './analysis/signalThrottler';
import { calculateATRForTicker } from './analysis/atrCalculator';
import { selectOptimalStrike } from './analysis/strikeSelector';
import { analyzeNewsCatalyst } from './analysis/newsCatalystFilter';
import { shouldSuppressSignal } from './analysis/volatilityRegime';
import { shouldSuppressForChop } from './analysis/trendState';

const prisma = new PrismaClient();

/**
 * MONITORED TICKERS (Top 10 liquid names)
 */
const WATCHED_TICKERS = [
  'SPY',
  'QQQ',
  'AAPL',
  'TSLA',
  'NVDA',
  'AMD',
  'AMZN',
  'META',
  'GOOGL',
  'MSFT',
];

/**
 * Main signal engine: Scan for institutional-grade signals
 */
export async function scanForInstitutionalSignals(io: SocketServer): Promise<void> {
  console.log('🏦 [INSTITUTIONAL ENGINE] Starting scan...');

  const stats = await getSignalStatistics();
  console.log(
    `📊 Current stats: ${stats.signalsLast30Min} last 30min | ${stats.signalsLastHour} last hour | ${stats.signalsToday} today`
  );

  for (const ticker of WATCHED_TICKERS) {
    try {
      await scanTickerForSignals(ticker, io);
    } catch (error) {
      console.error(`[ENGINE] Error scanning ${ticker}:`, error);
    }
  }

  console.log('✅ [INSTITUTIONAL ENGINE] Scan complete');
}

/**
 * Scan a single ticker for potential signals
 */
async function scanTickerForSignals(ticker: string, io: SocketServer): Promise<void> {
  // 1. PRE-CHECK: Is ticker eligible?
  const eligibility = await preCheckSignalEligibility(ticker);
  if (!eligibility.eligible) {
    console.log(`⏭️  [${ticker}] Skipping: ${eligibility.reason}`);
    return;
  }

  // 2. THROTTLE CHECK: Are we allowed to create a signal?
  const throttle = await checkSignalThrottle(ticker);
  if (!throttle.allowed) {
    console.log(`🚫 [${ticker}] Throttled: ${throttle.reason}`);
    return;
  }

  // 3. GET CURRENT PRICE
  const marketData = await prisma.marketData.findFirst({
    where: { ticker },
    orderBy: { timestamp: 'desc' },
    select: { close: true },
  });

  if (!marketData) {
    console.log(`⏭️  [${ticker}] No market data`);
    return;
  }

  const currentPrice = marketData.close;

  // 4. TRY BOTH DIRECTIONS (CALL and PUT)
  for (const direction of ['CALL', 'PUT'] as const) {
    try {
      await evaluateSignal(ticker, direction, currentPrice, io);
    } catch (error) {
      console.error(`[${ticker}] Error evaluating ${direction}:`, error);
    }
  }
}

/**
 * Evaluate a potential signal using the 5-pillar institutional system
 */
async function evaluateSignal(
  ticker: string,
  direction: 'CALL' | 'PUT',
  currentPrice: number,
  io: SocketServer
): Promise<void> {
  console.log(`🔍 [${ticker}] Evaluating ${direction} signal...`);

  // 1. CALCULATE INSTITUTIONAL SCORE (5 pillars)
  const score = await calculateInstitutionalScore(ticker, direction, currentPrice);

  console.log(`📊 [${ticker}] ${direction} Score: ${score.totalConfidence}% (need 65%)`);
  console.log(
    `   ├─ Trend State: ${score.pillar1_trendState}/30 (${score.details.trend.state})`
  );
  console.log(
    `   ├─ Flow Heat: ${score.pillar2_flowHeat}/30 (${score.details.flow.netSentiment})`
  );
  console.log(
    `   ├─ Volatility: ${score.pillar3_volatility}/20 (${score.details.volatility.marketState})`
  );
  console.log(`   ├─ Liquidity: ${score.pillar4_liquidity}/10`);
  console.log(
    `   └─ Correlation: ${score.pillar5_correlation}/10 (${score.details.correlation.indexDirection})`
  );

  // 2. CHECK IF MEETS THRESHOLD
  if (!score.meetsThreshold) {
    console.log(`❌ [${ticker}] ${direction} rejected: ${score.recommendation}`);
    return;
  }

  // 3. CHOP SUPPRESSION CHECK
  if (shouldSuppressForChop(score.details.trend)) {
    console.log(`🚫 [${ticker}] ${direction} suppressed due to CHOP market conditions`);
    return;
  }

  // 4. VOLATILITY SUPPRESSION CHECK
  if (shouldSuppressSignal(score.details.volatility)) {
    console.log(
      `🚫 [${ticker}] ${direction} suppressed due to ${score.details.volatility.marketState} conditions`
    );
    return;
  }

  // 5. CALCULATE ATR (for stops and targets)
  const atr = await calculateATRForTicker(ticker, currentPrice);

  // 6. SELECT OPTIMAL STRIKE AND EXPIRATION
  const strike = await selectOptimalStrike(
    ticker,
    direction,
    currentPrice,
    score.details.flow,
    score.details.trend,
    score.details.volatility
  );

  // 7. DETERMINE SIGNAL TYPE
  const signalType = determineSignalType(
    strike.expirationDays,
    score.details.flow,
    score.details.trend
  );

  // 8. CALCULATE TRADE LEVELS (using ATR)
  const entryPrice = currentPrice;
  const stopLoss =
    strike.expirationDays === 0 ? atr.recommendedStop : currentPrice - 1.5 * atr.atr1Min;
  const targetPrice =
    strike.expirationDays === 0 ? atr.recommendedTarget0DTE : atr.recommendedTarget1DTE;

  const maxLoss = Math.abs(entryPrice - stopLoss);
  const potentialGain = Math.abs(targetPrice - entryPrice);
  const riskReward = potentialGain / maxLoss;

  // 9. GENERATE REASONING
  const reasoning = generateInstitutionalReasoning(
    ticker,
    direction,
    score,
    strike,
    atr,
    signalType
  );

  // 10. CHECK NEWS CATALYST (if signal type is NEWS)
  let newsCatalyst = null;
  if (signalType === 'NEWS') {
    newsCatalyst = await analyzeNewsCatalyst(ticker);
    if (!newsCatalyst.shouldFireSignal) {
      console.log(`❌ [${ticker}] News signal rejected: No real catalyst`);
      return;
    }
  }

  // 11. DETERMINE RISK LEVEL
  const riskLevel = determineRiskLevel(score, strike.expirationDays);

  // 12. SET EXPIRATION TIME
  const expiresAt = new Date(strike.expiration);

  // 13. CREATE SIGNAL IN DATABASE
  try {
    const signal = await prisma.signal.create({
      data: {
        ticker,
        signalType,
        direction,
        strikePrice: strike.strikePrice,
        expirationDate: strike.expiration,
        entryPrice,
        stopLoss,
        targetPrice,
        confidence: score.totalConfidence,
        flowScore: score.pillar2_flowHeat,
        volumeScore: Math.min(100, score.pillar2_flowHeat * 1.2), // Derived from flow
        oiScore: Math.min(100, score.pillar2_flowHeat * 1.1), // Derived from flow
        technicalScore: (score.pillar1_trendState / 30) * 100, // Normalize to 0-100
        sentimentScore: newsCatalyst ? Math.abs(newsCatalyst.sentimentScore) * 100 : 50,
        volatilityScore: (score.pillar3_volatility / 20) * 100, // Normalize to 0-100
        riskLevel,
        maxLoss,
        potentialGain,
        riskReward,
        reasoning,
        expiresAt,
        isActive: true,
        accuracy: {
          create: {
            outcome: 'PENDING',
          },
        },
      },
      include: {
        accuracy: true,
      },
    });

    // 14. RECORD IN THROTTLE CACHE
    recordSignalInCache(ticker);

    // 15. EMIT VIA WEBSOCKET
    io.emit('newSignal', signal);

    console.log(
      `✅ [${ticker}] ${direction} SIGNAL CREATED: ${score.totalConfidence}% confidence, ${signalType}, $${strike.strikePrice} strike`
    );
    console.log(`   💰 Entry: $${entryPrice} | 🛑 Stop: $${stopLoss} | 🎯 Target: $${targetPrice}`);
    console.log(`   📈 R:R = ${riskReward.toFixed(2)}x | Risk: ${riskLevel}`);
    console.log(`   📝 ${reasoning.slice(0, 100)}...`);

  } catch (error) {
    console.error(`[${ticker}] Error creating signal:`, error);
  }
}

/**
 * Determine signal type based on expiration and conditions
 */
function determineSignalType(
  expirationDays: number,
  flowData: any,
  trendData: any
): '0DTE' | 'WEEKLY' | 'DARK_POOL' | 'NEWS' {
  // Dark pool signals: High flow heat with large sweeps
  if (flowData.hasHeat && flowData.largestSweep > 500000) {
    return 'DARK_POOL';
  }

  // 0DTE: Same-day expiration
  if (expirationDays === 0) {
    return '0DTE';
  }

  // Default to WEEKLY for multi-day expirations
  return 'WEEKLY';
}

/**
 * Generate institutional-grade reasoning
 */
function generateInstitutionalReasoning(
  ticker: string,
  direction: 'CALL' | 'PUT',
  score: any,
  strike: any,
  atr: any,
  signalType: string
): string {
  const reasons: string[] = [];

  // Trend state
  const trend = score.details.trend;
  if (trend.state === 'STRONG_TREND') {
    reasons.push(`${trend.direction} STRONG TREND confirmed (EMA sep: ${trend.emaSeparation.toFixed(2)}%, MACD: ${trend.macdHistogram.toFixed(3)})`);
  } else if (trend.state === 'WEAK_TREND') {
    reasons.push(`${trend.direction} weak trend detected`);
  }

  // Flow heat
  const flow = score.details.flow;
  if (flow.hasHeat) {
    reasons.push(
      `Institutional flow heat: $${(flow.totalBullishPremium + flow.totalBearishPremium).toLocaleString()} premium, ${flow.clusters.length} clusters`
    );
  }

  // Correlation
  const corr = score.details.correlation;
  if (corr.isConfirmed) {
    reasons.push(`${corr.indexDirection} index confirms signal`);
  }

  // Volatility regime
  const vol = score.details.volatility;
  reasons.push(
    `${vol.regime} vol regime (VIX: ${vol.vix.toFixed(1)}, RVOL: ${vol.rvol.toFixed(2)}x)`
  );

  // Strike selection
  reasons.push(strike.reasoning);

  // ATR levels
  reasons.push(
    `ATR-based levels: Stop at ${atr.atrNormalized.toFixed(2)}% below entry, target ${strike.expirationDays === 0 ? '1.8x' : '2.5x'} ATR`
  );

  return reasons.join('. ') + '.';
}

/**
 * Determine risk level
 */
function determineRiskLevel(score: any, expirationDays: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  // 0DTE is inherently higher risk
  if (expirationDays === 0) {
    if (score.totalConfidence >= 80) return 'MEDIUM'; // Even high confidence 0DTE is medium risk
    if (score.totalConfidence >= 70) return 'HIGH';
    return 'EXTREME';
  }

  // Multi-day expirations
  if (score.totalConfidence >= 85) return 'LOW';
  if (score.totalConfidence >= 75) return 'MEDIUM';
  if (score.totalConfidence >= 65) return 'HIGH';
  return 'EXTREME';
}

/**
 * Initialize the institutional signal engine
 */
export function initializeInstitutionalSignalEngine(io: SocketServer): void {
  console.log('🏦 Initializing Institutional Signal Engine V2.0...');

  // Run every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Monday-Friday)
  cron.schedule('*/5 9-15 * * 1-5', async () => {
    try {
      await scanForInstitutionalSignals(io);
    } catch (error) {
      console.error('[ENGINE] Error during scan:', error);
    }
  });

  // Run once at 9:30 AM ET
  cron.schedule('30 9 * * 1-5', async () => {
    console.log('🔔 Market open! Starting first scan...');
    try {
      await scanForInstitutionalSignals(io);
    } catch (error) {
      console.error('[ENGINE] Error during market open scan:', error);
    }
  });

  console.log('✅ Institutional Signal Engine initialized');
  console.log('   ⏰ Scanning every 5 minutes during market hours');
  console.log('   📊 5-Pillar Confidence System active');
  console.log('   🚦 Signal throttling active (max 6/hour, 1 per ticker per 30min)');
  console.log('   🎯 ATR-based stops and targets active');
  console.log('   🔍 Chop suppression active (80% during sideways markets)');
}
