import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { runBacktest, collectHistoricalOutcome, type BacktestConfig } from '../services/backtestingService';

const router = Router();
const prisma = new PrismaClient();

// Create and run a new backtest
router.post('/run', authMiddleware, async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      initialCapital = 10000,
      positionSize = 1000,
      signalTypes,
      minConfidence,
      maxRisk
    } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: name, startDate, endDate'
      });
    }

    const config: BacktestConfig = {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
      positionSize,
      signalTypes,
      minConfidence,
      maxRisk
    };

    const result = await runBacktest(config);

    res.json({
      message: 'Backtest completed successfully',
      result
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

// Get all backtest runs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const runs = await prisma.backtestRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        _count: {
          select: { trades: true }
        }
      }
    });

    const total = await prisma.backtestRun.count({ where });

    res.json({
      runs: runs.map((run: any) => ({
        ...run,
        tradeCount: run._count.trades
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + runs.length
      }
    });
  } catch (error) {
    console.error('Error fetching backtests:', error);
    res.status(500).json({ error: 'Failed to fetch backtests' });
  }
});

// Get specific backtest run with details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const run = await prisma.backtestRun.findUnique({
      where: { id },
      include: {
        trades: {
          orderBy: { entryDate: 'asc' }
        }
      }
    });

    if (!run) {
      return res.status(404).json({ error: 'Backtest run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Error fetching backtest:', error);
    res.status(500).json({ error: 'Failed to fetch backtest' });
  }
});

// Delete backtest run
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.backtestRun.delete({
      where: { id }
    });

    res.json({ message: 'Backtest deleted successfully' });
  } catch (error) {
    console.error('Error deleting backtest:', error);
    res.status(500).json({ error: 'Failed to delete backtest' });
  }
});

// Get backtest statistics
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const totalRuns = await prisma.backtestRun.count();
    const completedRuns = await prisma.backtestRun.count({
      where: { status: 'COMPLETED' }
    });

    const avgMetrics = await prisma.backtestRun.aggregate({
      where: { status: 'COMPLETED' },
      _avg: {
        winRate: true,
        totalReturn: true,
        sharpeRatio: true,
        maxDrawdown: true
      }
    });

    const bestRun = await prisma.backtestRun.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { totalReturn: 'desc' }
    });

    res.json({
      totalRuns,
      completedRuns,
      averages: {
        winRate: avgMetrics._avg.winRate?.toFixed(2) || 0,
        totalReturn: avgMetrics._avg.totalReturn?.toFixed(2) || 0,
        sharpeRatio: avgMetrics._avg.sharpeRatio?.toFixed(2) || 0,
        maxDrawdown: avgMetrics._avg.maxDrawdown?.toFixed(2) || 0
      },
      bestRun: bestRun ? {
        id: bestRun.id,
        name: bestRun.name,
        totalReturn: bestRun.totalReturn,
        winRate: bestRun.winRate
      } : null
    });
  } catch (error) {
    console.error('Error fetching backtest stats:', error);
    res.status(500).json({ error: 'Failed to fetch backtest stats' });
  }
});

// Collect historical outcome for a signal
router.post('/collect-outcome/:signalId', authMiddleware, async (req, res) => {
  try {
    const { signalId } = req.params;

    const outcome = await collectHistoricalOutcome(signalId);

    res.json({
      message: 'Historical outcome collected successfully',
      outcome
    });
  } catch (error) {
    console.error('Error collecting historical outcome:', error);
    res.status(500).json({ error: 'Failed to collect historical outcome' });
  }
});

// Get historical outcomes
router.get('/outcomes/history', authMiddleware, async (req, res) => {
  try {
    const { ticker, outcome, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (ticker) where.ticker = ticker as string;
    if (outcome) where.outcome = outcome as string;

    const outcomes = await prisma.historicalSignalOutcome.findMany({
      where,
      orderBy: { dataCollectedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.historicalSignalOutcome.count({ where });

    res.json({
      outcomes,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + outcomes.length
      }
    });
  } catch (error) {
    console.error('Error fetching historical outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch historical outcomes' });
  }
});

export default router;
