import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all folders for authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const folders = await prisma.watchlistFolder.findMany({
      where: { userId },
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json(folders);
  } catch (error) {
    console.error('Error fetching watchlist folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create a new folder
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, color } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Get max order to append new folder at end
    const maxOrderFolder = await prisma.watchlistFolder.findFirst({
      where: { userId },
      orderBy: { order: 'desc' }
    });

    const order = maxOrderFolder ? maxOrderFolder.order + 1 : 0;

    const folder = await prisma.watchlistFolder.create({
      data: {
        userId,
        name: name.trim(),
        color: color || null,
        order
      },
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    res.json({
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Get specific folder with items
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const folderId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const folder = await prisma.watchlistFolder.findFirst({
      where: {
        id: folderId,
        userId
      },
      include: {
        items: {
          include: {
            signal: {
              include: {
                accuracy: true
              }
            }
          }
        },
        _count: {
          select: { items: true }
        }
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// Update folder
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const folderId = req.params.id;
    const { name, color, order } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify folder belongs to user
    const existingFolder = await prisma.watchlistFolder.findFirst({
      where: {
        id: folderId,
        userId
      }
    });

    if (!existingFolder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color || null;
    if (order !== undefined) data.order = order;

    const folder = await prisma.watchlistFolder.update({
      where: { id: folderId },
      data,
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    res.json({
      message: 'Folder updated successfully',
      folder
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder (moves items to uncategorized)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const folderId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify folder belongs to user
    const folder = await prisma.watchlistFolder.findFirst({
      where: {
        id: folderId,
        userId
      }
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Move all items in this folder to uncategorized (folderId = null)
    await prisma.watchlist.updateMany({
      where: { folderId },
      data: { folderId: null }
    });

    // Delete the folder
    await prisma.watchlistFolder.delete({
      where: { id: folderId }
    });

    res.json({
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Reorder folders
router.post('/reorder', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { folderOrders } = req.body; // Array of { id, order }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!Array.isArray(folderOrders)) {
      return res.status(400).json({ error: 'Invalid folder orders' });
    }

    // Update each folder's order
    await Promise.all(
      folderOrders.map(({ id, order }: any) =>
        prisma.watchlistFolder.updateMany({
          where: {
            id,
            userId // Ensure user owns the folder
          },
          data: { order }
        })
      )
    );

    // Return updated folders
    const folders = await prisma.watchlistFolder.findMany({
      where: { userId },
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    res.json({
      message: 'Folders reordered successfully',
      folders
    });
  } catch (error) {
    console.error('Error reordering folders:', error);
    res.status(500).json({ error: 'Failed to reorder folders' });
  }
});

// Move watchlist item to folder
router.post('/:id/move', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const watchlistId = req.params.id;
    const { folderId } = req.body; // null to remove from folder

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify watchlist item belongs to user
    const watchlistItem = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId
      }
    });

    if (!watchlistItem) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }

    // If moving to a folder, verify folder exists and belongs to user
    if (folderId) {
      const folder = await prisma.watchlistFolder.findFirst({
        where: {
          id: folderId,
          userId
        }
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    // Update watchlist item
    const updated = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: { folderId: folderId || null },
      include: {
        signal: true,
        folder: true
      }
    });

    res.json({
      message: 'Item moved successfully',
      item: updated
    });
  } catch (error) {
    console.error('Error moving watchlist item:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

export default router;
