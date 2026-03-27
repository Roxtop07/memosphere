import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all policies
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status, type, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { orgId: req.user.orgId };

    // Role-based filtering
    if (req.user.role === 'GUEST') {
      where.isPublic = true;
      where.status = 'ACTIVE';
    } else if (req.user.role === 'MEMBER') {
      where.OR = [
        { isPublic: true },
        { status: 'ACTIVE' },
        { createdById: req.user.sub },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { content: { contains: search as string } },
      ];
    }

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          department: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      policies: policies.map((p) => ({
        ...p,
        tags: p.tags ? JSON.parse(p.tags) : [],
        metadata: p.metadata ? JSON.parse(p.metadata) : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get single policy
router.get('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        department: true,
      },
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Check access
    if (!policy.isPublic && policy.status !== 'ACTIVE') {
      if (policy.createdById !== req.user.sub && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
        return res.status(403).json({ error: 'Not authorized to view this policy' });
      }
    }

    res.json({
      ...policy,
      tags: policy.tags ? JSON.parse(policy.tags) : [],
      metadata: policy.metadata ? JSON.parse(policy.metadata) : null,
    });
  } catch (error) {
    logger.error('Get policy error:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// Create policy
router.post('/', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title, description, content, type, effectiveDate, expiryDate,
      isPublic, tags, departmentId,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const policy = await prisma.policy.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        title,
        description,
        content,
        type: type || 'GENERAL',
        status: 'DRAFT',
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isPublic: isPublic || false,
        tags: tags ? JSON.stringify(tags) : null,
        createdById: req.user.sub,
        departmentId,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'POLICY_CREATED',
        entityType: 'policy',
        entityId: policy.id,
        newValue: JSON.stringify({ title }),
      },
    });

    logger.info(`Policy created: ${policy.id}`);

    res.status(201).json(policy);
  } catch (error) {
    logger.error('Create policy error:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// Update policy
router.put('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.policy.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (existing.createdById !== req.user.sub && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Not authorized to update this policy' });
    }

    const {
      title, description, content, type, status, effectiveDate, expiryDate,
      isPublic, tags,
    } = req.body;

    // Increment version if content changes
    const newVersion = content !== existing.content ? existing.version + 1 : existing.version;

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        content,
        type,
        status,
        version: newVersion,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        isPublic,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'POLICY_UPDATED',
        entityType: 'policy',
        entityId: policy.id,
        oldValue: JSON.stringify({ version: existing.version }),
        newValue: JSON.stringify({ version: newVersion }),
      },
    });

    res.json(policy);
  } catch (error) {
    logger.error('Update policy error:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// Delete policy
router.delete('/:id', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    await prisma.policy.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'POLICY_DELETED',
        entityType: 'policy',
        entityId: policy.id,
        oldValue: JSON.stringify({ title: policy.title }),
      },
    });

    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    logger.error('Delete policy error:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

// Publish policy
router.post('/:id/publish', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        approvedById: req.user.sub,
        approvedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'POLICY_PUBLISHED',
        entityType: 'policy',
        entityId: policy.id,
      },
    });

    res.json({ message: 'Policy published', policy });
  } catch (error) {
    logger.error('Publish policy error:', error);
    res.status(500).json({ error: 'Failed to publish policy' });
  }
});

// Archive policy
router.post('/:id/archive', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: { status: 'ARCHIVED' },
    });

    res.json({ message: 'Policy archived', policy });
  } catch (error) {
    logger.error('Archive policy error:', error);
    res.status(500).json({ error: 'Failed to archive policy' });
  }
});

export default router;
