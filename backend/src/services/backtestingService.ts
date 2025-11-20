import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BacktestConfig {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSize: number;
  signalTypes?: string[];
  minConfidence?: number;
  maxRisk?: string;
}

export interface BacktestResult {
  runId: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  totalPnL: number;
  avgReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTradeResult[];
}

export interface BacktestTradeResult {
  ticker: string;
  signalType: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  entryDate: Date;
  exitDate: Date;
  pnl: number;
  returnPercent: number;
  outcome: string;
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  // Create backtest run record
  const backtestRun = await prisma.backtestRun.create({
    data: {
      name: config.name,
      description: config.description,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      positionSize: config.positionSize,
      signalTypes: config.signalTypes ? JSON.parse(JSON.stringify(config.signalTypes)) : null,
      minConfidence: config.minConfidence,
      maxRisk: config.maxRisk,
      status: 'RUNNING'
    }
  });

  try {
    // Get historical signals matching the criteria
    const signals = await getBacktestSignals(config);

    // Simulate trades
    const trades = await simulateTrades(signals, config, backtestRun.id);

    // Calculate metrics
    const metrics = calculateMetrics(trades, config.initialCapital);

    // Update backtest run with results
    await prisma.backtestRun.update({
      where: { id: backtestRun.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: metrics.winRate,
        totalReturn: metrics.totalReturn,
        totalPnL: metrics.totalPnL,
        avgReturn: metrics.avgReturn,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio
      }
    });

    return {
      runId: backtestRun.id,
      ...metrics,
      trades: trades.map(t => ({
        ticker: t.ticker,
        signalType: t.signalType,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        entryDate: t.entryDate,
        exitDate: t.exitDate,
        pnl: t.pnl,
        returnPercent: t.returnPercent,
        outcome: t.outcome
      }))
    };
  } catch (error) {
    // Update backtest run with error
    await prisma.backtestRun.update({
      where: { id: backtestRun.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}

async function getBacktestSignals(config: BacktestConfig) {
  const where: any = {
    createdAt: {
      gte: config.startDate,
      lte: config.endDate
    }
  };

  if (config.signalTypes && config.signalTypes.length > 0) {
    where.signalType = { in: config.signalTypes };
  }

  if (config.minConfidence) {
    where.confidence = { gte: config.minConfidence };
  }

  if (config.maxRisk) {
    where.riskLevel = config.maxRisk;
  }

  return await prisma.signal.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  });
}

async function simulateTrades(signals: any[], config: BacktestConfig, backtestRunId: string) {
  const trades: any[] = [];

  for (const signal of signals) {
    // Calculate exit price based on signal outcome
    const exitPrice = calculateExitPrice(signal);
    const exitDate = calculateExitDate(signal);

    const quantity = Math.floor(config.positionSize / signal.entryPrice);
    const pnl = (exitPrice - signal.entryPrice) * quantity;
    const returnPercent = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;

    const outcome = determineOutcome(returnPercent, signal);

    const trade = await prisma.backtestTrade.create({
      data: {
        backtestRunId,
        signalId: signal.id,
        ticker: signal.ticker,
        signalType: signal.signalType,
        direction: signal.direction,
        strikePrice: signal.strikePrice,
        expirationDate: signal.expirationDate,
        entryPrice: signal.entryPrice,
        exitPrice,
        entryDate: signal.createdAt,
        exitDate,
        quantity,
        pnl,
        returnPercent,
        outcome,
        confidence: signal.confidence,
        riskLevel: signal.riskLevel
      }
    });

    trades.push(trade);
  }

  return trades;
}

function calculateExitPrice(signal: any): number {
  // Check if we have historical outcome data
  const accuracy = signal.accuracy as any;

  if (accuracy && accuracy.actualReturn !== undefined) {
    return signal.entryPrice * (1 + accuracy.actualReturn / 100);
  }

  // Simulate based on confidence and random walk
  const confidenceFactor = signal.confidence / 100;
  const successChance = Math.random();

  if (successChance < confidenceFactor) {
    // Win: Move towards target with some variance
    const targetMove = (signal.targetPrice - signal.entryPrice);
    const actualMove = targetMove * (0.5 + Math.random() * 0.5); // 50-100% of target
    return signal.entryPrice + actualMove;
  } else {
    // Loss: Move towards stop loss with some variance
    const stopMove = (signal.entryPrice - signal.stopLoss);
    const actualMove = stopMove * (0.5 + Math.random() * 0.5); // 50-100% of stop
    return signal.entryPrice - actualMove;
  }
}

function calculateExitDate(signal: any): Date {
  // For 0DTE, exit same day
  if (signal.signalType === '0DTE') {
    const exitDate = new Date(signal.createdAt);
    exitDate.setHours(15, 55, 0); // Market close
    return exitDate;
  }

  // For weekly, exit before expiration
  const daysUntilExpiry = Math.floor(
    (signal.expirationDate.getTime() - signal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const exitDays = Math.floor(Math.random() * (daysUntilExpiry + 1));
  const exitDate = new Date(signal.createdAt);
  exitDate.setDate(exitDate.getDate() + exitDays);

  return exitDate;
}

function determineOutcome(returnPercent: number, signal: any): string {
  if (returnPercent > 2) return 'WIN';
  if (returnPercent < -2) return 'LOSS';
  return 'BREAK_EVEN';
}

function calculateMetrics(trades: any[], initialCapital: number) {
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => t.outcome === 'WIN').length;
  const losingTrades = trades.filter((t: any) => t.outcome === 'LOSS').length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPnL = trades.reduce((sum: number, t: any) => sum + t.pnl, 0);
  const totalReturn = (totalPnL / initialCapital) * 100;
  const avgReturn = totalTrades > 0 ? totalReturn / totalTrades : 0;

  // Calculate maximum drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  let runningCapital = initialCapital;

  trades.forEach((trade: any) => {
    runningCapital += trade.pnl;
    if (runningCapital > peak) {
      peak = runningCapital;
    }
    const drawdown = ((peak - runningCapital) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // Calculate Sharpe Ratio (simplified)
  const returns = trades.map((t: any) => t.returnPercent);
  const avgTradeReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgTradeReturn, 2), 0) / returns.length
  );
  const sharpeRatio = stdDev !== 0 ? (avgTradeReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Math.round(winRate * 10) / 10,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgReturn: Math.round(avgReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100
  };
}

export async function collectHistoricalOutcome(signalId: string) {
  const signal = await prisma.signal.findUnique({
    where: { id: signalId }
  });

  if (!signal) {
    throw new Error('Signal not found');
  }

  // Check if outcome already exists
  const existing = await prisma.historicalSignalOutcome.findUnique({
    where: { signalId }
  });

  if (existing) {
    return existing;
  }

  // Get actual outcome from signal's accuracy data
  const accuracy = (signal as any).accuracy;
  const outcome = accuracy?.outcome;
  const actualReturn = accuracy?.actualReturn;

  // Create historical outcome record
  return await prisma.historicalSignalOutcome.create({
    data: {
      signalId,
      ticker: signal.ticker,
      signalType: signal.signalType,
      direction: signal.direction,
      strikePrice: signal.strikePrice,
      expirationDate: signal.expirationDate,
      entryPrice: signal.entryPrice,
      entryDate: signal.createdAt,
      exitPrice: actualReturn ? signal.entryPrice * (1 + actualReturn / 100) : null,
      exitDate: signal.expiresAt,
      outcome,
      actualReturn
    }
  });
}
