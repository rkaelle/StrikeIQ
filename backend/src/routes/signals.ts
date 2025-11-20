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
    const wins = signals.filter((s: any) => s.accuracy?.outcome === 'WIN').length;
    const losses = signals.filter((s: any) => s.accuracy?.outcome === 'LOSS').length;
    const pending = signals.filter((s: any) => s.accuracy?.outcome === 'PENDING').length;

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

// Get user's activated signals
router.get('/activated', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all activated signal IDs for this user
    const activations = await prisma.userSignalActivation.findMany({
      where: {
        userId,
        activated: true
      },
      include: {
        signal: {
          include: {
            accuracy: true
          }
        }
      },
      orderBy: {
        activatedAt: 'desc'
      }
    });

    // Extract signals from activations
    const signals = activations.map((activation: any) => ({
      ...activation.signal,
      activatedAt: activation.activatedAt
    }));

    res.json(signals);
  } catch (error) {
    console.error('Error fetching activated signals:', error);
    res.status(500).json({ error: 'Failed to fetch activated signals' });
  }
});

// Activate a signal for the authenticated user
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const signalId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if signal exists
    const signal = await prisma.signal.findUnique({
      where: { id: signalId }
    });

    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }

    // Check if activation already exists
    const existingActivation = await prisma.userSignalActivation.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId
        }
      }
    });

    let activation;

    if (existingActivation) {
      // Update existing activation
      activation = await prisma.userSignalActivation.update({
        where: {
          userId_signalId: {
            userId,
            signalId
          }
        },
        data: {
          activated: true,
          activatedAt: new Date(),
          deactivatedAt: null
        },
        include: {
          signal: true
        }
      });
    } else {
      // Create new activation
      activation = await prisma.userSignalActivation.create({
        data: {
          userId,
          signalId,
          activated: true,
          activatedAt: new Date()
        },
        include: {
          signal: true
        }
      });
    }

    res.json({
      message: 'Signal activated successfully',
      activation
    });
  } catch (error) {
    console.error('Error activating signal:', error);
    res.status(500).json({ error: 'Failed to activate signal' });
  }
});

// Deactivate a signal for the authenticated user
router.post('/:id/deactivate', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const signalId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if activation exists
    const existingActivation = await prisma.userSignalActivation.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId
        }
      }
    });

    if (!existingActivation) {
      return res.status(404).json({ error: 'Signal activation not found' });
    }

    // Update activation to deactivated
    const activation = await prisma.userSignalActivation.update({
      where: {
        userId_signalId: {
          userId,
          signalId
        }
      },
      data: {
        activated: false,
        deactivatedAt: new Date()
      },
      include: {
        signal: true
      }
    });

    res.json({
      message: 'Signal deactivated successfully',
      activation
    });
  } catch (error) {
    console.error('Error deactivating signal:', error);
    res.status(500).json({ error: 'Failed to deactivate signal' });
  }
});

// Check if a signal is activated for the user
router.get('/:id/activation-status', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const signalId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const activation = await prisma.userSignalActivation.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId
        }
      }
    });

    res.json({
      isActivated: activation?.activated || false,
      activatedAt: activation?.activatedAt,
      deactivatedAt: activation?.deactivatedAt
    });
  } catch (error) {
    console.error('Error checking activation status:', error);
    res.status(500).json({ error: 'Failed to check activation status' });
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
      active: signals.filter((s: any) => s.isActive).length,
      inactive: signals.filter((s: any) => !s.isActive).length
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
