import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user's watchlist
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        signal: {
          include: { accuracy: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Add to watchlist
router.post('/', async (req, res) => {
  try {
    const { userId, signalId, notes } = req.body;

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_signalId: { userId, signalId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Signal already in watchlist' });
    }

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        signalId,
        notes
      },
      include: {
        signal: {
          include: { accuracy: true }
        }
      }
    });

    res.status(201).json(watchlistItem);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// Update watchlist item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, alertSet } = req.body;

    const watchlistItem = await prisma.watchlist.update({
      where: { id },
      data: { notes, alertSet },
      include: {
        signal: {
          include: { accuracy: true }
        }
      }
    });

    res.json(watchlistItem);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// Remove from watchlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.watchlist.delete({
      where: { id }
    });

    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

export default router;
