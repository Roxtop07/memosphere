import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get user's notifications
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { isRead, type, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      orgId: req.user.orgId,
      userId: req.user.sub,
    };

    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    res.json({
      notifications: notifications.map((n) => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      unreadCount,
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const count = await prisma.notification.count({
      where: {
        orgId: req.user.orgId,
        userId: req.user.sub,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user.sub,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: {
        orgId: req.user.orgId,
        userId: req.user.sub,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const result = await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user.sub,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all read notifications
router.delete('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.deleteMany({
      where: {
        orgId: req.user.orgId,
        userId: req.user.sub,
        isRead: true,
      },
    });

    res.json({ message: 'All read notifications deleted' });
  } catch (error) {
    logger.error('Delete all error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

// Send notification (admin/system use)
router.post('/', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { userId, userIds, type, title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'At least one user ID required' });
    }

    // Create notifications for all target users
    await prisma.notification.createMany({
      data: targetUserIds.map((uid: string) => ({
        id: uuidv4(),
        orgId: req.user!.orgId,
        userId: uid,
        type: type || 'INFO',
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      })),
    });

    logger.info(`Notifications sent to ${targetUserIds.length} users`);

    res.status(201).json({ message: 'Notifications sent', count: targetUserIds.length });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Broadcast notification to all org users (admin only)
router.post('/broadcast', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { type, title, message, data } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Get all active users in org
    const users = await prisma.user.findMany({
      where: { orgId: req.user.orgId, isActive: true },
      select: { id: true },
    });

    // Create notifications for all users
    await prisma.notification.createMany({
      data: users.map((user) => ({
        id: uuidv4(),
        orgId: req.user!.orgId,
        userId: user.id,
        type: type || 'ANNOUNCEMENT',
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      })),
    });

    logger.info(`Broadcast sent to ${users.length} users in org ${req.user.orgId}`);

    res.status(201).json({ message: 'Broadcast sent', count: users.length });
  } catch (error) {
    logger.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

export default router;
