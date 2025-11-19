import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import cron from 'node-cron';
import { analyzeOptionsFlow } from './analysis/flowAnalysis';
import { analyzeTechnicals } from './analysis/technicalAnalysis';
import { analyzeVolatility } from './analysis/volatilityAnalysis';
import { analyzeSentiment } from './analysis/sentimentAnalysis';
import { calculateRiskMetrics } from './analysis/riskAnalysis';

const prisma = new PrismaClient();

interface SignalFactors {
  flowScore: number;
  volumeScore: number;
  oiScore: number;
  technicalScore: number;
  sentimentScore: number;
  volatilityScore: number;
}

interface SignalInput {
  ticker: string;
  signalType: '0DTE' | 'WEEKLY' | 'EARNINGS' | 'DARK_POOL' | 'NEWS';
  direction: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: Date;
  currentPrice: number;
  factors: SignalFactors;
}

// Confidence calculation weights by signal type
const SIGNAL_WEIGHTS = {
  '0DTE': {
    flowScore: 0.30,
    volumeScore: 0.25,
    oiScore: 0.10,
    technicalScore: 0.20,
    sentimentScore: 0.05,
    volatilityScore: 0.10
  },
  'WEEKLY': {
    flowScore: 0.25,
    volumeScore: 0.20,
    oiScore: 0.15,
    technicalScore: 0.25,
    sentimentScore: 0.05,
    volatilityScore: 0.10
  },
  'EARNINGS': {
    flowScore: 0.20,
    volumeScore: 0.15,
    oiScore: 0.20,
    technicalScore: 0.15,
    sentimentScore: 0.20,
    volatilityScore: 0.10
  },
  'DARK_POOL': {
    flowScore: 0.40,
    volumeScore: 0.20,
    oiScore: 0.15,
    technicalScore: 0.15,
    sentimentScore: 0.05,
    volatilityScore: 0.05
  },
  'NEWS': {
    flowScore: 0.15,
    volumeScore: 0.15,
    oiScore: 0.10,
    technicalScore: 0.15,
    sentimentScore: 0.35,
    volatilityScore: 0.10
  }
};

// Calculate confidence percentage
function calculateConfidence(signalType: string, factors: SignalFactors): number {
  const weights = SIGNAL_WEIGHTS[signalType as keyof typeof SIGNAL_WEIGHTS];

  let confidence = 0;
  confidence += factors.flowScore * weights.flowScore;
  confidence += factors.volumeScore * weights.volumeScore;
  confidence += factors.oiScore * weights.oiScore;
  confidence += factors.technicalScore * weights.technicalScore;
  confidence += factors.sentimentScore * weights.sentimentScore;
  confidence += factors.volatilityScore * weights.volatilityScore;

  return Math.min(Math.max(confidence, 0), 100);
}

// Determine risk level based on factors
function determineRiskLevel(factors: SignalFactors, volatilityScore: number): string {
  const avgScore = Object.values(factors).reduce((a, b) => a + b, 0) / 6;

  if (volatilityScore > 80 || avgScore < 40) return 'EXTREME';
  if (volatilityScore > 60 || avgScore < 55) return 'HIGH';
  if (volatilityScore > 40 || avgScore < 70) return 'MEDIUM';
  return 'LOW';
}

// Calculate entry, stop loss, and target prices
function calculateTradeLevels(
  direction: 'CALL' | 'PUT',
  currentPrice: number,
  confidence: number,
  riskLevel: string
): { entryPrice: number; stopLoss: number; targetPrice: number } {
  const riskMultipliers = {
    'LOW': { stop: 0.15, target: 0.40 },
    'MEDIUM': { stop: 0.20, target: 0.50 },
    'HIGH': { stop: 0.25, target: 0.60 },
    'EXTREME': { stop: 0.30, target: 0.80 }
  };

  const multiplier = riskMultipliers[riskLevel as keyof typeof riskMultipliers];
  const confidenceBoost = (confidence - 50) / 100;

  const entryPrice = currentPrice;
  const stopLoss = currentPrice * (1 - multiplier.stop);
  const targetPrice = currentPrice * (1 + multiplier.target + confidenceBoost * 0.2);

  return { entryPrice, stopLoss, targetPrice };
}

// Generate reasoning for the signal
function generateReasoning(
  ticker: string,
  signalType: string,
  direction: string,
  factors: SignalFactors,
  confidence: number
): string {
  const reasons: string[] = [];

  if (factors.flowScore > 70) {
    reasons.push(`Strong institutional ${direction.toLowerCase()} flow detected`);
  }
  if (factors.volumeScore > 70) {
    reasons.push('Unusual volume surge indicates momentum');
  }
  if (factors.oiScore > 70) {
    reasons.push('Open interest buildup suggests conviction');
  }
  if (factors.technicalScore > 70) {
    reasons.push('Technical indicators align with entry');
  }
  if (factors.sentimentScore > 70) {
    reasons.push('Positive market sentiment from news/social');
  }
  if (factors.volatilityScore > 70) {
    reasons.push('Volatility conditions favorable for premium');
  }

  const typeContext = {
    '0DTE': 'Same-day expiration provides high gamma exposure',
    'WEEKLY': 'Weekly expiry balances time decay with opportunity',
    'EARNINGS': 'Pre-earnings positioning based on flow patterns',
    'DARK_POOL': 'Significant dark pool activity detected',
    'NEWS': 'Breaking news catalyst identified'
  };

  reasons.push(typeContext[signalType as keyof typeof typeContext]);

  return reasons.join('. ') + '.';
}

// Create a new signal
export async function createSignal(input: SignalInput): Promise<any> {
  const confidence = calculateConfidence(input.signalType, input.factors);
  const riskLevel = determineRiskLevel(input.factors, input.factors.volatilityScore);
  const { entryPrice, stopLoss, targetPrice } = calculateTradeLevels(
    input.direction,
    input.currentPrice,
    confidence,
    riskLevel
  );

  const maxLoss = entryPrice - stopLoss;
  const potentialGain = targetPrice - entryPrice;
  const riskReward = potentialGain / maxLoss;

  const reasoning = generateReasoning(
    input.ticker,
    input.signalType,
    input.direction,
    input.factors,
    confidence
  );

  // Set expiration based on signal type
  const expiresAt = new Date();
  if (input.signalType === '0DTE') {
    expiresAt.setHours(16, 0, 0, 0); // Market close
  } else {
    expiresAt.setDate(expiresAt.getDate() + 1);
  }

  const signal = await prisma.signal.create({
    data: {
      ticker: input.ticker,
      signalType: input.signalType,
      direction: input.direction,
      strikePrice: input.strikePrice,
      expirationDate: input.expirationDate,
      entryPrice,
      stopLoss,
      targetPrice,
      confidence,
      flowScore: input.factors.flowScore,
      volumeScore: input.factors.volumeScore,
      oiScore: input.factors.oiScore,
      technicalScore: input.factors.technicalScore,
      sentimentScore: input.factors.sentimentScore,
      volatilityScore: input.factors.volatilityScore,
      riskLevel,
      maxLoss,
      potentialGain,
      riskReward,
      reasoning,
      expiresAt,
      isActive: true,
      accuracy: {
        create: {
          outcome: 'PENDING'
        }
      }
    },
    include: {
      accuracy: true
    }
  });

  return signal;
}

// Scan for new signals
async function scanForSignals(io: SocketServer) {
  console.log('🔍 Scanning for signals...');

  // Get active tickers to monitor
  const watchedTickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'META', 'GOOGL', 'MSFT'];

  for (const ticker of watchedTickers) {
    try {
      // Analyze different signal types
      const flowAnalysis = await analyzeOptionsFlow(ticker);
      const technicalAnalysis = await analyzeTechnicals(ticker);
      const volatilityAnalysis = await analyzeVolatility(ticker);
      const sentimentAnalysis = await analyzeSentiment(ticker);

      // Check for 0DTE signals
      if (flowAnalysis.unusual0DTE) {
        const signal = await createSignal({
          ticker,
          signalType: '0DTE',
          direction: flowAnalysis.direction,
          strikePrice: flowAnalysis.strikePrice,
          expirationDate: new Date(),
          currentPrice: flowAnalysis.premium,
          factors: {
            flowScore: flowAnalysis.score,
            volumeScore: technicalAnalysis.volumeScore,
            oiScore: flowAnalysis.oiScore,
            technicalScore: technicalAnalysis.score,
            sentimentScore: sentimentAnalysis.score,
            volatilityScore: volatilityAnalysis.score
          }
        });

        io.emit('newSignal', signal);
      }

      // Check for weekly signals
      if (flowAnalysis.unusualWeekly && technicalAnalysis.trend !== 'NEUTRAL') {
        const signal = await createSignal({
          ticker,
          signalType: 'WEEKLY',
          direction: flowAnalysis.direction,
          strikePrice: flowAnalysis.weeklyStrike,
          expirationDate: getNextFriday(),
          currentPrice: flowAnalysis.weeklyPremium,
          factors: {
            flowScore: flowAnalysis.weeklyScore,
            volumeScore: technicalAnalysis.volumeScore,
            oiScore: flowAnalysis.weeklyOiScore,
            technicalScore: technicalAnalysis.score,
            sentimentScore: sentimentAnalysis.score,
            volatilityScore: volatilityAnalysis.score
          }
        });

        io.emit('newSignal', signal);
      }

      // Check for dark pool signals
      if (flowAnalysis.darkPoolAlert) {
        const signal = await createSignal({
          ticker,
          signalType: 'DARK_POOL',
          direction: flowAnalysis.darkPoolDirection,
          strikePrice: flowAnalysis.darkPoolStrike,
          expirationDate: getNextFriday(),
          currentPrice: flowAnalysis.darkPoolPremium,
          factors: {
            flowScore: flowAnalysis.darkPoolScore,
            volumeScore: technicalAnalysis.volumeScore,
            oiScore: flowAnalysis.darkPoolOi,
            technicalScore: technicalAnalysis.score,
            sentimentScore: sentimentAnalysis.score,
            volatilityScore: volatilityAnalysis.score
          }
        });

        io.emit('newSignal', signal);
      }

      // Check for news signals
      if (sentimentAnalysis.breakingNews) {
        const signal = await createSignal({
          ticker,
          signalType: 'NEWS',
          direction: sentimentAnalysis.newsDirection,
          strikePrice: technicalAnalysis.nearestStrike,
          expirationDate: getNextFriday(),
          currentPrice: technicalAnalysis.currentPrice,
          factors: {
            flowScore: flowAnalysis.score,
            volumeScore: technicalAnalysis.volumeScore,
            oiScore: flowAnalysis.oiScore,
            technicalScore: technicalAnalysis.score,
            sentimentScore: sentimentAnalysis.score,
            volatilityScore: volatilityAnalysis.score
          }
        });

        io.emit('newSignal', signal);
      }

    } catch (error) {
      console.error(`Error scanning ${ticker}:`, error);
    }
  }
}

// Update signal accuracy
async function updateSignalAccuracy() {
  console.log('📈 Updating signal accuracy...');

  const activeSignals = await prisma.signal.findMany({
    where: {
      isActive: true,
      expiresAt: { lte: new Date() }
    },
    include: {
      accuracy: true
    }
  });

  for (const signal of activeSignals) {
    // In production, fetch actual market data to determine outcome
    // For now, using simulation
    const outcome = Math.random() > 0.4 ? 'WIN' : 'LOSS';
    const actualReturn = outcome === 'WIN'
      ? signal.potentialGain * (0.5 + Math.random() * 0.5)
      : -signal.maxLoss * (0.3 + Math.random() * 0.7);

    await prisma.signalAccuracy.update({
      where: { signalId: signal.id },
      data: {
        outcome,
        actualReturn,
        hitTarget: outcome === 'WIN',
        hitStopLoss: outcome === 'LOSS',
        closedAt: new Date()
      }
    });

    await prisma.signal.update({
      where: { id: signal.id },
      data: { isActive: false }
    });
  }
}

// Helper function to get next Friday
function getNextFriday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  nextFriday.setHours(16, 0, 0, 0);
  return nextFriday;
}

// Start the signal engine
export function startSignalEngine(io: SocketServer) {
  // Scan for signals every 5 minutes during market hours
  cron.schedule('*/5 9-16 * * 1-5', () => {
    scanForSignals(io);
  });

  // Update accuracy every hour
  cron.schedule('0 * * * *', () => {
    updateSignalAccuracy();
  });

  // Initial scan
  scanForSignals(io);
}

export { calculateConfidence, determineRiskLevel };
