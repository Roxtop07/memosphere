import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all events
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status, type, startDate, endDate, search, isPublic, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { orgId: req.user.orgId };

    // Role-based filtering
    if (req.user.role === 'MEMBER' || req.user.role === 'GUEST') {
      where.OR = [
        { createdById: req.user.sub },
        { isPublic: true },
        { attendees: { some: { userId: req.user.sub } } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    if (startDate) where.startDate = { gte: new Date(startDate as string) };
    if (endDate) where.endDate = { lte: new Date(endDate as string) };
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
          attendees: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
              },
            },
            take: 10,
          },
          department: { select: { id: true, name: true } },
          _count: { select: { attendees: true } },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      events: events.map((e) => ({
        ...e,
        tags: e.tags ? JSON.parse(e.tags) : [],
        agenda: e.agenda ? JSON.parse(e.agenda) : null,
        speakers: e.speakers ? JSON.parse(e.speakers) : [],
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        attendeeCount: e._count.attendees,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
            },
          },
        },
        department: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check access for private events
    if (!event.isPublic && event.createdById !== req.user.sub) {
      const isAttendee = event.attendees.some((a) => a.userId === req.user!.sub);
      if (!isAttendee && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
        return res.status(403).json({ error: 'Not authorized to view this event' });
      }
    }

    res.json({
      ...event,
      tags: event.tags ? JSON.parse(event.tags) : [],
      agenda: event.agenda ? JSON.parse(event.agenda) : null,
      speakers: event.speakers ? JSON.parse(event.speakers) : [],
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
    });
  } catch (error) {
    logger.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event
router.post('/', withTenant, requireRole('ADMIN', 'ORGANIZER', 'MEMBER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title, description, type, startDate, endDate, location, venue, address,
      isVirtual, virtualUrl, capacity, requiresRegistration, registrationDeadline,
      isPublic, coverImage, agenda, speakers, tags, departmentId,
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    const event = await prisma.event.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        title,
        description,
        type: type || 'GENERAL',
        status: 'DRAFT',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        venue,
        address,
        isVirtual: isVirtual || false,
        virtualUrl,
        capacity,
        requiresRegistration: requiresRegistration !== false,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        isPublic: isPublic || false,
        coverImage,
        agenda: agenda ? JSON.stringify(agenda) : null,
        speakers: speakers ? JSON.stringify(speakers) : null,
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
        action: 'EVENT_CREATED',
        entityType: 'event',
        entityId: event.id,
        newValue: JSON.stringify({ title }),
      },
    });

    logger.info(`Event created: ${event.id}`);

    res.status(201).json(event);
  } catch (error) {
    logger.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existing.createdById !== req.user.sub && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const {
      title, description, type, status, startDate, endDate, location, venue, address,
      isVirtual, virtualUrl, capacity, requiresRegistration, registrationDeadline,
      isPublic, coverImage, agenda, speakers, tags,
    } = req.body;

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        type,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location,
        venue,
        address,
        isVirtual,
        virtualUrl,
        capacity,
        requiresRegistration,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
        isPublic,
        coverImage,
        agenda: agenda ? JSON.stringify(agenda) : undefined,
        speakers: speakers ? JSON.stringify(speakers) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'EVENT_UPDATED',
        entityType: 'event',
        entityId: event.id,
      },
    });

    res.json(event);
  } catch (error) {
    logger.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.createdById !== req.user.sub && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await prisma.event.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'EVENT_DELETED',
        entityType: 'event',
        entityId: event.id,
        oldValue: JSON.stringify({ title: event.title }),
      },
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Publish event
router.post('/:id/publish', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });

    res.json({ message: 'Event published', event });
  } catch (error) {
    logger.error('Publish event error:', error);
    res.status(500).json({ error: 'Failed to publish event' });
  }
});

// Register for event
router.post('/:id/register', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
      include: { _count: { select: { attendees: true } } },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check capacity
    if (event.capacity && event._count.attendees >= event.capacity) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check registration deadline
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ error: 'Registration deadline passed' });
    }

    const attendee = await prisma.eventAttendee.upsert({
      where: {
        eventId_userId: { eventId: req.params.id, userId: req.user.sub },
      },
      create: {
        id: uuidv4(),
        eventId: req.params.id,
        userId: req.user.sub,
        status: 'REGISTERED',
      },
      update: { status: 'REGISTERED' },
    });

    // Update attendee count
    await prisma.event.update({
      where: { id: req.params.id },
      data: { currentAttendees: { increment: 1 } },
    });

    res.json({ message: 'Registered successfully', attendee });
  } catch (error) {
    logger.error('Register for event error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Cancel registration
router.delete('/:id/register', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.eventAttendee.deleteMany({
      where: {
        eventId: req.params.id,
        userId: req.user.sub,
      },
    });

    await prisma.event.update({
      where: { id: req.params.id },
      data: { currentAttendees: { decrement: 1 } },
    });

    res.json({ message: 'Registration cancelled' });
  } catch (error) {
    logger.error('Cancel registration error:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// Check in attendee
router.post('/:id/check-in', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { userId } = req.body;
    const targetUserId = userId || req.user.sub;

    const attendee = await prisma.eventAttendee.updateMany({
      where: {
        eventId: req.params.id,
        userId: targetUserId,
      },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });

    if (attendee.count === 0) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    res.json({ message: 'Check-in successful' });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

export default router;
