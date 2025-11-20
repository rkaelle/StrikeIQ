import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Log a user action
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { action, entityId, metadata, deviceType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!action || !deviceType) {
      return res.status(400).json({ error: 'Missing required fields: action, deviceType' });
    }

    const userAction = await prisma.userAction.create({
      data: {
        userId,
        action,
        entityId: entityId || null,
        metadata: metadata || null,
        deviceType
      }
    });

    res.json({
      message: 'Action logged successfully',
      action: userAction
    });
  } catch (error) {
    console.error('Error logging user action:', error);
    res.status(500).json({ error: 'Failed to log action' });
  }
});

// Get user actions with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { action, deviceType, limit = 100, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = { userId };
    if (action) where.action = action;
    if (deviceType) where.deviceType = deviceType;

    const actions = await prisma.userAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.userAction.count({ where });

    res.json({
      actions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + actions.length
      }
    });
  } catch (error) {
    console.error('Error fetching user actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// Get action analytics for user
router.get('/analytics', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const startDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Get actions grouped by action type
    const actionsByType = await prisma.userAction.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Get actions grouped by device type
    const actionsByDevice = await prisma.userAction.groupBy({
      by: ['deviceType'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Get daily activity
    const allActions = await prisma.userAction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyActivity = allActions.reduce((acc: any, action: any) => {
      const date = action.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      period: `${days} days`,
      totalActions: allActions.length,
      byActionType: actionsByType.map((item: any) => ({
        action: item.action,
        count: item._count
      })),
      byDevice: actionsByDevice.map((item: any) => ({
        device: item.deviceType,
        count: item._count
      })),
      dailyActivity: Object.entries(dailyActivity).map(([date, count]: any) => ({
        date,
        count
      }))
    });
  } catch (error) {
    console.error('Error fetching action analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get/Update user preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          defaultFilters: undefined,
          notificationSettings: undefined,
          watchlistView: 'list',
          theme: 'dark'
        }
      });
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { defaultFilters, notificationSettings, watchlistView, theme } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const data: any = {};
    if (defaultFilters !== undefined) data.defaultFilters = defaultFilters;
    if (notificationSettings !== undefined) data.notificationSettings = notificationSettings;
    if (watchlistView !== undefined) data.watchlistView = watchlistView;
    if (theme !== undefined) data.theme = theme;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data
      }
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Batch log multiple actions (for sync operations)
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { actions } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ error: 'Invalid actions array' });
    }

    // Validate and prepare actions
    const actionsToCreate = actions.map((action: any) => ({
      userId,
      action: action.action,
      entityId: action.entityId || null,
      metadata: action.metadata || null,
      deviceType: action.deviceType,
      createdAt: action.createdAt ? new Date(action.createdAt) : new Date()
    }));

    const result = await prisma.userAction.createMany({
      data: actionsToCreate,
      skipDuplicates: true
    });

    res.json({
      message: 'Actions logged successfully',
      count: result.count
    });
  } catch (error) {
    console.error('Error batch logging actions:', error);
    res.status(500).json({ error: 'Failed to batch log actions' });
  }
});

export default router;
