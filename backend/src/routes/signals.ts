import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all active signals
router.get('/', async (req, res) => {
  try {
    const { type, direction, minConfidence, ticker } = req.query;

    const where: any = { isActive: true };

    if (type) where.signalType = type;
    if (direction) where.direction = direction;
    if (minConfidence) where.confidence = { gte: Number(minConfidence) };
    if (ticker) where.ticker = ticker;

    const signals = await prisma.signal.findMany({
      where,
      include: { accuracy: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// Get signal by ID
router.get('/:id', async (req, res) => {
  try {
    const signal = await prisma.signal.findUnique({
      where: { id: req.params.id },
      include: { accuracy: true }
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    res.json(signal);
  } catch (error) {
    console.error('Error fetching signal:', error);
    res.status(500).json({ error: 'Failed to fetch signal' });
  }
});

// Get signals by type
router.get('/type/:type', async (req, res) => {
  try {
    const signals = await prisma.signal.findMany({
      where: {
        signalType: req.params.type,
        isActive: true
      },
      include: { accuracy: true },
      orderBy: { confidence: 'desc' },
      take: 20
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals by type:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// Get historical signals with accuracy
router.get('/history/all', async (req, res) => {
  try {
    const { days = 30, type } = req.query;

    const where: any = {
      createdAt: {
        gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
      }
    };

    if (type) where.signalType = type;

    const signals = await prisma.signal.findMany({
      where,
      include: { accuracy: true },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate stats
    const total = signals.length;
    const wins = signals.filter(s => s.accuracy?.outcome === 'WIN').length;
    const losses = signals.filter(s => s.accuracy?.outcome === 'LOSS').length;
    const pending = signals.filter(s => s.accuracy?.outcome === 'PENDING').length;

    res.json({
      signals,
      stats: {
        total,
        wins,
        losses,
        pending,
        winRate: total > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching signal history:', error);
    res.status(500).json({ error: 'Failed to fetch signal history' });
  }
});

// Get top performing signals
router.get('/top/performers', async (req, res) => {
  try {
    const signals = await prisma.signal.findMany({
      where: {
        accuracy: {
          outcome: 'WIN'
        }
      },
      include: { accuracy: true },
      orderBy: { confidence: 'desc' },
      take: 10
    });

    res.json(signals);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// Debug: Get all signals including inactive
router.get('/debug/all', async (req, res) => {
  try {
    const signals = await prisma.signal.findMany({
      include: { accuracy: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const stats = {
      total: signals.length,
      active: signals.filter(s => s.isActive).length,
      inactive: signals.filter(s => !s.isActive).length
    };

    res.json({ stats, signals });
  } catch (error) {
    console.error('Error fetching all signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

// Fix: Activate all signals
router.post('/fix/activate-all', async (req, res) => {
  try {
    const result = await prisma.signal.updateMany({
      where: { isActive: false },
      data: { isActive: true }
    });

    res.json({
      message: `Activated ${result.count} signals`,
      count: result.count
    });
  } catch (error) {
    console.error('Error activating signals:', error);
    res.status(500).json({ error: 'Failed to activate signals' });
  }
});

export default router;
