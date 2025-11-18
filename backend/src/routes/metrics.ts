import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get system performance metrics
router.get('/system', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get signals from the period
    const signals = await prisma.signal.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
        }
      },
      include: { accuracy: true }
    });

    // Overall stats
    const total = signals.length;
    const wins = signals.filter(s => s.accuracy?.outcome === 'WIN').length;
    const losses = signals.filter(s => s.accuracy?.outcome === 'LOSS').length;
    const pending = signals.filter(s => s.accuracy?.outcome === 'PENDING').length;

    // Stats by signal type
    const byType = ['0DTE', 'WEEKLY', 'EARNINGS', 'DARK_POOL', 'NEWS'].reduce((acc, type) => {
      const typeSignals = signals.filter(s => s.signalType === type);
      const typeWins = typeSignals.filter(s => s.accuracy?.outcome === 'WIN').length;
      const typeLosses = typeSignals.filter(s => s.accuracy?.outcome === 'LOSS').length;

      acc[type] = {
        total: typeSignals.length,
        wins: typeWins,
        losses: typeLosses,
        winRate: typeWins + typeLosses > 0
          ? ((typeWins / (typeWins + typeLosses)) * 100).toFixed(1)
          : 0
      };

      return acc;
    }, {} as Record<string, any>);

    // Average returns
    const completedSignals = signals.filter(s => s.accuracy?.actualReturn !== null);
    const avgReturn = completedSignals.length > 0
      ? completedSignals.reduce((sum, s) => sum + (s.accuracy?.actualReturn || 0), 0) / completedSignals.length
      : 0;

    // Average confidence
    const avgConfidence = total > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / total
      : 0;

    // Risk/reward
    const avgRiskReward = total > 0
      ? signals.reduce((sum, s) => sum + s.riskReward, 0) / total
      : 0;

    res.json({
      period: `${days} days`,
      overall: {
        total,
        wins,
        losses,
        pending,
        winRate: wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0,
        avgReturn: avgReturn.toFixed(2),
        avgConfidence: avgConfidence.toFixed(1),
        avgRiskReward: avgRiskReward.toFixed(2)
      },
      byType
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get user performance metrics
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const trades = await prisma.userTrade.findMany({
      where: {
        userId,
        enteredAt: {
          gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
        }
      }
    });

    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const wins = closedTrades.filter(t => t.outcome === 'WIN').length;
    const losses = closedTrades.filter(t => t.outcome === 'LOSS').length;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // Calculate streak
    let currentStreak = 0;
    let streakType = '';
    const sortedTrades = closedTrades.sort((a, b) =>
      new Date(b.exitedAt || 0).getTime() - new Date(a.exitedAt || 0).getTime()
    );

    for (const trade of sortedTrades) {
      if (!streakType) {
        streakType = trade.outcome || '';
        currentStreak = 1;
      } else if (trade.outcome === streakType) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Best and worst trades
    const bestTrade = closedTrades.reduce((best, t) =>
      (t.pnl || 0) > (best?.pnl || 0) ? t : best
    , closedTrades[0]);

    const worstTrade = closedTrades.reduce((worst, t) =>
      (t.pnl || 0) < (worst?.pnl || 0) ? t : worst
    , closedTrades[0]);

    res.json({
      period: `${days} days`,
      totalTrades: trades.length,
      openTrades: trades.filter(t => t.status === 'OPEN').length,
      closedTrades: closedTrades.length,
      wins,
      losses,
      winRate: wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0,
      totalPnl: totalPnl.toFixed(2),
      avgPnl: closedTrades.length > 0 ? (totalPnl / closedTrades.length).toFixed(2) : 0,
      currentStreak: `${currentStreak} ${streakType.toLowerCase()}s`,
      bestTrade: bestTrade ? {
        ticker: bestTrade.ticker,
        pnl: bestTrade.pnl?.toFixed(2)
      } : null,
      worstTrade: worstTrade ? {
        ticker: worstTrade.ticker,
        pnl: worstTrade.pnl?.toFixed(2)
      } : null
    });
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        trades: {
          where: { status: 'CLOSED' }
        }
      }
    });

    const leaderboard = users.map(user => {
      const wins = user.trades.filter(t => t.outcome === 'WIN').length;
      const total = user.trades.length;
      const totalPnl = user.trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

      return {
        userId: user.id,
        name: user.name || 'Anonymous',
        totalTrades: total,
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : 0,
        totalPnl: totalPnl.toFixed(2)
      };
    }).sort((a, b) => Number(b.totalPnl) - Number(a.totalPnl));

    res.json(leaderboard.slice(0, 10));
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
