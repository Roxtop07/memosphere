import { z } from 'zod';

/**
 * RBAC Permission definitions
 * Controls what each role can do
 */

export enum Permission {
  // Organization permissions
  ORG_MANAGE = 'org:manage',
  ORG_VIEW = 'org:view',
  
  // User permissions
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_VIEW = 'user:view',
  
  // Meeting permissions
  MEETING_CREATE = 'meeting:create',
  MEETING_UPDATE = 'meeting:update',
  MEETING_DELETE = 'meeting:delete',
  MEETING_VIEW = 'meeting:view',
  MEETING_VIEW_ALL = 'meeting:view_all', // Can see all meetings, not just invited
  
  // Event permissions
  EVENT_CREATE = 'event:create',
  EVENT_UPDATE = 'event:update',
  EVENT_DELETE = 'event:delete',
  EVENT_VIEW = 'event:view',
  EVENT_VIEW_ALL = 'event:view_all',
  
  // Policy permissions
  POLICY_CREATE = 'policy:create',
  POLICY_UPDATE = 'policy:update',
  POLICY_DELETE = 'policy:delete',
  POLICY_APPROVE = 'policy:approve',
  POLICY_VIEW = 'policy:view',
  
  // Audit permissions
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',
  
  // Settings permissions
  SETTINGS_UPDATE = 'settings:update',
}

/**
 * Role to permissions mapping
 */
export const RolePermissions: Record<string, Permission[]> = {
  ADMIN: [
    // Full access to everything
    Permission.ORG_MANAGE,
    Permission.ORG_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_VIEW,
    Permission.MEETING_CREATE,
    Permission.MEETING_UPDATE,
    Permission.MEETING_DELETE,
    Permission.MEETING_VIEW,
    Permission.MEETING_VIEW_ALL,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_VIEW,
    Permission.EVENT_VIEW_ALL,
    Permission.POLICY_CREATE,
    Permission.POLICY_UPDATE,
    Permission.POLICY_DELETE,
    Permission.POLICY_APPROVE,
    Permission.POLICY_VIEW,
    Permission.AUDIT_VIEW,
    Permission.AUDIT_EXPORT,
    Permission.SETTINGS_UPDATE,
  ],
  
  ORGANIZER: [
    // Can create and manage meetings/events/policies
    Permission.ORG_VIEW,
    Permission.USER_VIEW,
    Permission.MEETING_CREATE,
    Permission.MEETING_UPDATE,
    Permission.MEETING_DELETE,
    Permission.MEETING_VIEW,
    Permission.MEETING_VIEW_ALL,
    Permission.EVENT_CREATE,
    Permission.EVENT_UPDATE,
    Permission.EVENT_DELETE,
    Permission.EVENT_VIEW,
    Permission.EVENT_VIEW_ALL,
    Permission.POLICY_CREATE,
    Permission.POLICY_UPDATE,
    Permission.POLICY_VIEW,
  ],
  
  MEMBER: [
    // Can only see invited meetings and public events/policies
    Permission.ORG_VIEW,
    Permission.USER_VIEW,
    Permission.MEETING_VIEW, // Only meetings they're invited to
    Permission.EVENT_VIEW,
    Permission.POLICY_VIEW,
  ],
  
  GUEST: [
    // Very limited access, only specific shared resources
    Permission.MEETING_VIEW,
    Permission.EVENT_VIEW,
    Permission.POLICY_VIEW,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = RolePermissions[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * Middleware to check permission
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required permission: ${permission}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to check any of the permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!hasAnyPermission(req.user.role, permissions)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required any of permissions: ${permissions.join(', ')}`,
      });
      return;
    }
    
    next();
  };
}

/**
 * Validation schemas for RBAC
 */
export const roleSchema = z.enum(['ADMIN', 'ORGANIZER', 'MEMBER', 'GUEST']);

export const permissionSchema = z.nativeEnum(Permission);

export const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
});

/**
 * Resource ownership check helpers
 */
export async function isResourceOwner(
  userId: string,
  resourceType: 'meeting' | 'event' | 'policy',
  resourceId: string,
  prisma: any
): Promise<boolean> {
  const modelMap = {
    meeting: prisma.meeting,
    event: prisma.event,
    policy: prisma.policy,
  };
  
  const model = modelMap[resourceType];
  
  const resource = await model.findUnique({
    where: { id: resourceId },
    select: { createdById: true },
  });
  
  return resource?.createdById === userId;
}

/**
 * Check if user is attendee of a meeting
 */
export async function isMeetingAttendee(
  userId: string,
  meetingId: string,
  prisma: any
): Promise<boolean> {
  const attendee = await prisma.meetingAttendee.findFirst({
    where: {
      meetingId,
      userId,
    },
  });
  
  return !!attendee;
}

/**
 * Check if user can access resource
 */
export async function canAccessResource(
  userId: string,
  role: string,
  resourceType: 'meeting' | 'event' | 'policy',
  resourceId: string,
  prisma: any
): Promise<boolean> {
  // Admin and Organizer can see everything in their org (RLS handles org boundary)
  if (role === 'ADMIN' || role === 'ORGANIZER') {
    return true;
  }
  
  // Members and Guests need explicit access
  if (resourceType === 'meeting') {
    return await isMeetingAttendee(userId, resourceId, prisma);
  }
  
  // For events and policies, check if resource is public or user has access
  // This can be extended based on specific requirements
  return true;
}
