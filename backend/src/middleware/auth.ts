import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface JWTPayload {
  sub: string; // user ID
  orgId: string;
  role: 'ADMIN' | 'ORGANIZER' | 'MEMBER' | 'GUEST';
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  db?: any; // Prisma client with org context
}

/**
 * Multi-tenant authentication middleware
 * Verifies JWT and sets user context
 */
export async function withTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    // Verify JWT
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as JWTPayload;
    
    if (!payload.orgId) {
      res.status(401).json({ error: 'Invalid token: missing orgId' });
      return;
    }
    
    // Attach user info to request
    req.user = payload;
    
    logger.debug(`Authenticated user: ${payload.sub} in org: ${payload.orgId}`);
    
    // Continue to next middleware
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      logger.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...allowedRoles: JWTPayload['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  return requireRole('ADMIN')(req, res, next);
}

/**
 * Check if user is admin or organizer
 */
export function requireOrganizerOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  return requireRole('ADMIN', 'ORGANIZER')(req, res, next);
}

/**
 * Check if user can access a specific meeting
 * Members can only see meetings they're invited to
 */
export async function canAccessMeeting(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const meetingId = req.params.id || req.params.meetingId;
    
    if (!meetingId) {
      res.status(400).json({ error: 'Meeting ID required' });
      return;
    }
    
    // Admin and Organizer can see all meetings in their org
    if (req.user.role === 'ADMIN' || req.user.role === 'ORGANIZER') {
      next();
      return;
    }
    
    // Members and Guests need to be attendees
    const attendee = await prisma.meetingAttendee.findFirst({
      where: {
        meetingId,
        userId: req.user.sub,
      },
    });
    
    if (!attendee) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You are not invited to this meeting',
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Access check error:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'default-secret',
    {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
    } as jwt.SignOptions
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, orgId: string): string {
  return jwt.sign(
    { sub: userId, orgId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as string,
    } as jwt.SignOptions
  );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { sub: string; orgId: string } {
  const payload = jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || 'default-refresh-secret'
  ) as any;
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return { sub: payload.sub, orgId: payload.orgId };
}

/**
 * Audit log middleware - logs all actions
 */
export async function auditLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const originalSend = res.json;
  
  res.json = function (data: any) {
    // Log after response is sent
    setImmediate(async () => {
      try {
        if (req.user && prisma) {
          await prisma.auditLog.create({
            data: {
              orgId: req.user.orgId,
              userId: req.user.sub,
              action: `${req.method} ${req.path}`,
              entityType: extractEntityType(req.path),
              entityId: req.params.id || null,
              ipAddress: req.ip || null,
              userAgent: req.headers['user-agent'] || null,
              metadata: JSON.stringify({
                method: req.method,
                path: req.path,
                query: req.query,
                statusCode: res.statusCode,
              }),
            },
          });
        }
      } catch (error) {
        logger.error('Audit log error:', error);
      }
    });
    
    return originalSend.call(this, data);
  };
  
  next();
}

function extractEntityType(path: string): string {
  if (path.includes('/meetings')) return 'meeting';
  if (path.includes('/events')) return 'event';
  if (path.includes('/policies')) return 'policy';
  if (path.includes('/users')) return 'user';
  return 'unknown';
}
