import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all users in organization
router.get('/', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { role, isActive, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { orgId: req.user.orgId };

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { firstName: { contains: search as string } },
        { lastName: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          timezone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Non-admins can only view their own profile
    if (req.params.id !== req.user.sub && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatar: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        timezone: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user,
      preferences: user.preferences ? JSON.parse(user.preferences) : null,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    // Check if email exists in org
    const existingUser = await prisma.user.findFirst({
      where: { orgId: req.user.orgId, email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists in organization' });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'MEMBER',
        phoneNumber,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    logger.info(`User created: ${user.email}`);

    res.status(201).json(user);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Non-admins can only update their own profile (limited fields)
    if (req.params.id !== req.user.sub && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, phoneNumber, avatar, timezone, preferences, role, isActive } = req.body;

    // Build update data
    const updateData: any = {
      firstName,
      lastName,
      phoneNumber,
      avatar,
      timezone,
      preferences: preferences ? JSON.stringify(preferences) : undefined,
    };

    // Only admin can change role and active status
    if (req.user.role === 'ADMIN') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatar: true,
        role: true,
        isActive: true,
        timezone: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: user.id,
      },
    });

    res.json(user);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete/deactivate user
router.delete('/:id', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Cannot delete yourself
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete - deactivate instead of delete
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'USER_DEACTIVATED',
        entityType: 'user',
        entityId: user.id,
        oldValue: JSON.stringify({ email: user.email }),
      },
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Change user role
router.put('/:id/role', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { role } = req.body;

    if (!['ADMIN', 'ORGANIZER', 'MEMBER', 'GUEST'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'USER_ROLE_CHANGED',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({ role }),
      },
    });

    res.json(user);
  } catch (error) {
    logger.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change role' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    await prisma.user.update({
      where: { id: req.params.id },
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'USER_PASSWORD_RESET',
        entityType: 'user',
        entityId: req.params.id,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
