import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { generateToken, generateRefreshToken, verifyRefreshToken, withTenant, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Helper to generate org code
function generateOrgCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let code = '';
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)];
  return code;
}

// Register new user and organization
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, organizationName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !organizationName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email exists in any org
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Create organization
    const orgSlug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const organization = await prisma.organization.create({
      data: {
        id: uuidv4(),
        name: organizationName,
        slug: `${orgSlug}-${Date.now()}`,
        orgCode: generateOrgCode(),
      },
    });

    // Create user as admin of the org
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        orgId: organization.id,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    // Generate tokens
    const token = generateToken({
      sub: user.id,
      orgId: organization.id,
      role: 'ADMIN',
      email: user.email,
    });

    const refreshToken = generateRefreshToken(user.id, organization.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: organization.id,
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: user.id,
        metadata: JSON.stringify({ email: user.email }),
      },
    });

    logger.info(`New user registered: ${user.email} in org: ${organization.name}`);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        orgCode: organization.orgCode,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, orgCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    let whereClause: any = { email: email.toLowerCase(), isActive: true };
    
    // If org code provided, find in that org
    if (orgCode) {
      const org = await prisma.organization.findUnique({
        where: { orgCode },
      });
      if (!org) {
        return res.status(401).json({ error: 'Invalid organization code' });
      }
      whereClause.orgId = org.id;
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
      include: { organization: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if locked out
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ 
        error: 'Account locked',
        lockedUntil: user.lockedUntil 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Increment login attempts
      const newAttempts = user.loginAttempts + 1;
      const shouldLock = newAttempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: shouldLock 
            ? new Date(Date.now() + parseInt(process.env.LOCKOUT_DURATION || '900000'))
            : null,
        },
      });

      return res.status(401).json({ 
        error: 'Invalid credentials',
        attemptsRemaining: shouldLock ? 0 : 5 - newAttempts
      });
    }

    // Reset login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || null,
      },
    });

    // Generate tokens
    const token = generateToken({
      sub: user.id,
      orgId: user.orgId,
      role: user.role as any,
      email: user.email,
    });

    const refreshToken = generateRefreshToken(user.id, user.orgId);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create session
    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: user.orgId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences ? JSON.parse(user.preferences) : null,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        orgCode: user.organization.orgCode,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Revoke refresh token
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });
    }

    // Delete session
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    await prisma.session.deleteMany({
      where: { token },
    });

    // Log audit
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          id: uuidv4(),
          orgId: req.user.orgId,
          userId: req.user.sub,
          action: 'USER_LOGOUT',
          entityType: 'user',
          entityId: req.user.sub,
        },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if token exists and not revoked
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const newToken = generateToken({
      sub: storedToken.user.id,
      orgId: storedToken.user.orgId,
      role: storedToken.user.role as any,
      email: storedToken.user.email,
    });

    const newRefreshToken = generateRefreshToken(storedToken.user.id, storedToken.user.orgId);

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: storedToken.user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// Get current user profile
router.get('/me', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      phoneNumber: user.phoneNumber,
      timezone: user.timezone,
      twoFactorEnabled: user.twoFactorEnabled,
      preferences: user.preferences ? JSON.parse(user.preferences) : null,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        orgCode: user.organization.orgCode,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Change password
router.post('/change-password', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'PASSWORD_CHANGED',
        entityType: 'user',
        entityId: req.user.sub,
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Join organization with code
router.post('/join-org', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, orgCode } = req.body;

    if (!email || !password || !firstName || !lastName || !orgCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Find organization
    const organization = await prisma.organization.findUnique({
      where: { orgCode },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if email exists in org
    const existingUser = await prisma.user.findFirst({
      where: { 
        orgId: organization.id,
        email: email.toLowerCase() 
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered in this organization' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        orgId: organization.id,
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'MEMBER',
      },
    });

    // Generate tokens
    const token = generateToken({
      sub: user.id,
      orgId: organization.id,
      role: 'MEMBER',
      email: user.email,
    });

    const refreshToken = generateRefreshToken(user.id, organization.id);

    await prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info(`User joined org: ${user.email} -> ${organization.name}`);

    res.status(201).json({
      message: 'Joined organization successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        orgCode: organization.orgCode,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error('Join org error:', error);
    res.status(500).json({ error: 'Failed to join organization' });
  }
});

export default router;
