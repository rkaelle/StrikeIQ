import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { analyzePortfolioSectors, analyzeSectorDistribution, getSector } from '../services/sectorAnalysis';

const router = Router();
const prisma = new PrismaClient();

// Get sector analysis for user's active signals
router.get('/portfolio', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's activated signals
    const activations = await prisma.userSignalActivation.findMany({
      where: {
        userId,
        activated: true
      },
      include: {
        signal: true
      }
    });

    const tickers = activations.map((a: any) => a.signal.ticker);

    if (tickers.length === 0) {
      return res.json({
        totalSignals: 0,
        sectors: [],
        diversificationScore: 0,
        concentration: {
          topSector: 'None',
          topSectorPercentage: 0
        }
      });
    }

    const analysis = analyzePortfolioSectors(tickers);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing portfolio sectors:', error);
    res.status(500).json({ error: 'Failed to analyze portfolio sectors' });
  }
});

// Get sector breakdown for watchlist
router.get('/watchlist', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: { signal: true }
    });

    const tickers = watchlist.map((w: any) => w.signal.ticker);

    if (tickers.length === 0) {
      return res.json([]);
    }

    const breakdown = analyzeSectorDistribution(tickers);
    res.json(breakdown);
  } catch (error) {
    console.error('Error analyzing watchlist sectors:', error);
    res.status(500).json({ error: 'Failed to analyze watchlist sectors' });
  }
});

// Get sector for a specific ticker
router.get('/ticker/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const sector = getSector(ticker);

    res.json({
      ticker: ticker.toUpperCase(),
      sector
    });
  } catch (error) {
    console.error('Error getting ticker sector:', error);
    res.status(500).json({ error: 'Failed to get ticker sector' });
  }
});

// Get sector performance (signals grouped by sector)
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Get recent signals
    const signals = await prisma.signal.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        ticker: true,
        confidence: true,
        riskReward: true,
        accuracy: true
      }
    });

    // Group by sector
    const sectorPerformance: Record<string, {
      totalSignals: number;
      avgConfidence: number;
      avgRiskReward: number;
      wins: number;
      losses: number;
      winRate: number;
    }> = {};

    signals.forEach((signal: any) => {
      const sector = getSector(signal.ticker);

      if (!sectorPerformance[sector]) {
        sectorPerformance[sector] = {
          totalSignals: 0,
          avgConfidence: 0,
          avgRiskReward: 0,
          wins: 0,
          losses: 0,
          winRate: 0
        };
      }

      sectorPerformance[sector].totalSignals++;
      sectorPerformance[sector].avgConfidence += signal.confidence;
      sectorPerformance[sector].avgRiskReward += signal.riskReward;

      // Track wins/losses if accuracy data exists
      if (signal.accuracy) {
        const accuracy = signal.accuracy as any;
        if (accuracy.outcome === 'WIN') {
          sectorPerformance[sector].wins++;
        } else if (accuracy.outcome === 'LOSS') {
          sectorPerformance[sector].losses++;
        }
      }
    });

    // Calculate averages and win rates
    Object.keys(sectorPerformance).forEach(sector => {
      const data = sectorPerformance[sector];
      data.avgConfidence = data.avgConfidence / data.totalSignals;
      data.avgRiskReward = data.avgRiskReward / data.totalSignals;

      const resolvedSignals = data.wins + data.losses;
      data.winRate = resolvedSignals > 0 ? (data.wins / resolvedSignals) * 100 : 0;
    });

    // Convert to array and sort by total signals
    const performanceArray = Object.entries(sectorPerformance)
      .map(([sector, data]) => ({
        sector,
        ...data,
        avgConfidence: Math.round(data.avgConfidence * 10) / 10,
        avgRiskReward: Math.round(data.avgRiskReward * 10) / 10,
        winRate: Math.round(data.winRate * 10) / 10
      }))
      .sort((a, b) => b.totalSignals - a.totalSignals);

    res.json({
      period: `${days} days`,
      sectors: performanceArray
    });
  } catch (error) {
    console.error('Error getting sector performance:', error);
    res.status(500).json({ error: 'Failed to get sector performance' });
  }
});

export default router;
