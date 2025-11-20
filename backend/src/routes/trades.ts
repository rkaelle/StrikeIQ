import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get user's trades
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const where: any = { userId };
    if (status) where.status = status;

    const trades = await prisma.userTrade.findMany({
      where,
      include: { signal: true },
      orderBy: { enteredAt: 'desc' }
    });

    // Calculate stats
    const closedTrades = trades.filter((t: any) => t.status === 'CLOSED');
    const wins = closedTrades.filter((t: any) => t.outcome === 'WIN').length;
    const losses = closedTrades.filter((t: any) => t.outcome === 'LOSS').length;
    const totalPnl = closedTrades.reduce((sum: any, t: any) => sum + (t.pnl || 0), 0);

    res.json({
      trades,
      stats: {
        total: closedTrades.length,
        wins,
        losses,
        winRate: closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : 0,
        totalPnl: totalPnl.toFixed(2),
        avgPnl: closedTrades.length > 0 ? (totalPnl / closedTrades.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Create a trade
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      signalId,
      ticker,
      direction,
      strikePrice,
      expirationDate,
      entryPrice,
      quantity,
      notes
    } = req.body;

    const trade = await prisma.userTrade.create({
      data: {
        userId,
        signalId,
        ticker,
        direction,
        strikePrice,
        expirationDate: new Date(expirationDate),
        entryPrice,
        quantity,
        notes
      },
      include: { signal: true }
    });

    res.status(201).json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// Close a trade
router.put('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice, notes } = req.body;

    const trade = await prisma.userTrade.findUnique({ where: { id } });
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const pnl = (exitPrice - trade.entryPrice) * trade.quantity * 100; // Options are 100 shares
    const pnlPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    const outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN';

    const updatedTrade = await prisma.userTrade.update({
      where: { id },
      data: {
        exitPrice,
        pnl,
        pnlPercentage,
        outcome,
        status: 'CLOSED',
        exitedAt: new Date(),
        notes: notes || trade.notes
      },
      include: { signal: true }
    });

    res.json(updatedTrade);
  } catch (error) {
    console.error('Error closing trade:', error);
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

// Update a trade
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const trade = await prisma.userTrade.update({
      where: { id },
      data: req.body,
      include: { signal: true }
    });

    res.json(trade);
  } catch (error) {
    console.error('Error updating trade:', error);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// Delete a trade
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.userTrade.delete({ where: { id } });

    res.json({ message: 'Trade deleted' });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ error: 'Failed to delete trade' });
  }
});

export default router;
