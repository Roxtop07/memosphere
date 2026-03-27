import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { withTenant, requireRole, canAccessMeeting, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all meetings (with filtering)
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status, type, startDate, endDate, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with org filter
    const where: any = { orgId: req.user.orgId };

    // Role-based filtering
    if (req.user.role === 'MEMBER' || req.user.role === 'GUEST') {
      // Only show meetings user created or is invited to
      where.OR = [
        { createdById: req.user.sub },
        { attendees: { some: { userId: req.user.sub } } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (startDate) where.startTime = { gte: new Date(startDate as string) };
    if (endDate) where.endTime = { lte: new Date(endDate as string) };
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
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
          },
          department: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.meeting.count({ where }),
    ]);

    res.json({
      meetings: meetings.map((m) => ({
        ...m,
        tags: m.tags ? JSON.parse(m.tags) : [],
        keyPoints: m.keyPoints ? JSON.parse(m.keyPoints) : [],
        actionItems: m.actionItems ? JSON.parse(m.actionItems) : [],
        decisions: m.decisions ? JSON.parse(m.decisions) : [],
        metadata: m.metadata ? JSON.parse(m.metadata) : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get single meeting
router.get('/:id', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.findFirst({
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
        actions: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        department: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({
      ...meeting,
      tags: meeting.tags ? JSON.parse(meeting.tags) : [],
      keyPoints: meeting.keyPoints ? JSON.parse(meeting.keyPoints) : [],
      actionItems: meeting.actionItems ? JSON.parse(meeting.actionItems) : [],
      decisions: meeting.decisions ? JSON.parse(meeting.decisions) : [],
      metadata: meeting.metadata ? JSON.parse(meeting.metadata) : null,
    });
  } catch (error) {
    logger.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// Create meeting
router.post('/', withTenant, requireRole('ADMIN', 'ORGANIZER', 'MEMBER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title, description, agenda, type, startTime, endTime, location,
      meetingUrl, isRecurring, recurrenceRule, isPrivate, attendees, tags, departmentId,
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    const meeting = await prisma.meeting.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        title,
        description,
        agenda,
        type: type || 'REGULAR',
        status: 'SCHEDULED',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        meetingUrl,
        isRecurring: isRecurring || false,
        recurrenceRule,
        isPrivate: isPrivate || false,
        tags: tags ? JSON.stringify(tags) : null,
        createdById: req.user.sub,
        departmentId,
      },
    });

    // Add attendees
    if (attendees && attendees.length > 0) {
      await prisma.meetingAttendee.createMany({
        data: attendees.map((a: any) => ({
          id: uuidv4(),
          meetingId: meeting.id,
          userId: a.userId,
          role: a.role || 'PARTICIPANT',
          status: 'PENDING',
        })),
      });

      // Create notifications for attendees
      await prisma.notification.createMany({
        data: attendees.map((a: any) => ({
          id: uuidv4(),
          orgId: req.user!.orgId,
          userId: a.userId,
          type: 'MEETING_INVITE',
          title: 'Meeting Invitation',
          message: `You've been invited to: ${title}`,
          data: JSON.stringify({ meetingId: meeting.id }),
        })),
      });
    }

    // Add creator as organizer
    await prisma.meetingAttendee.create({
      data: {
        id: uuidv4(),
        meetingId: meeting.id,
        userId: req.user.sub,
        role: 'ORGANIZER',
        status: 'ACCEPTED',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'MEETING_CREATED',
        entityType: 'meeting',
        entityId: meeting.id,
        newValue: JSON.stringify({ title }),
      },
    });

    logger.info(`Meeting created: ${meeting.id} by ${req.user.email}`);

    res.status(201).json(meeting);
  } catch (error) {
    logger.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Update meeting
router.put('/:id', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const existing = await prisma.meeting.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only creator, admin, or organizer can update
    if (existing.createdById !== req.user.sub && req.user.role !== 'ADMIN' && req.user.role !== 'ORGANIZER') {
      return res.status(403).json({ error: 'Not authorized to update this meeting' });
    }

    const {
      title, description, agenda, minutes, summary, type, status,
      startTime, endTime, location, meetingUrl, isRecurring, recurrenceRule,
      isPrivate, tags, keyPoints, actionItems, decisions, transcript,
    } = req.body;

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        agenda,
        minutes,
        summary,
        type,
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        location,
        meetingUrl,
        isRecurring,
        recurrenceRule,
        isPrivate,
        tags: tags ? JSON.stringify(tags) : undefined,
        keyPoints: keyPoints ? JSON.stringify(keyPoints) : undefined,
        actionItems: actionItems ? JSON.stringify(actionItems) : undefined,
        decisions: decisions ? JSON.stringify(decisions) : undefined,
        transcript,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'MEETING_UPDATED',
        entityType: 'meeting',
        entityId: meeting.id,
        oldValue: JSON.stringify({ title: existing.title }),
        newValue: JSON.stringify({ title: meeting.title }),
      },
    });

    res.json(meeting);
  } catch (error) {
    logger.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Delete meeting
router.delete('/:id', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, orgId: req.user.orgId },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Only creator or admin can delete
    if (meeting.createdById !== req.user.sub && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this meeting' });
    }

    await prisma.meeting.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        userId: req.user.sub,
        action: 'MEETING_DELETED',
        entityType: 'meeting',
        entityId: meeting.id,
        oldValue: JSON.stringify({ title: meeting.title }),
      },
    });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    logger.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

// Start meeting
router.post('/:id/start', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' },
    });

    res.json({ message: 'Meeting started', meeting });
  } catch (error) {
    logger.error('Start meeting error:', error);
    res.status(500).json({ error: 'Failed to start meeting' });
  }
});

// End meeting
router.post('/:id/end', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });

    res.json({ message: 'Meeting ended', meeting });
  } catch (error) {
    logger.error('End meeting error:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
});

// Add/update attendee
router.post('/:id/attendees', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { userId, role, status } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const attendee = await prisma.meetingAttendee.upsert({
      where: {
        meetingId_userId: { meetingId: req.params.id, userId },
      },
      create: {
        id: uuidv4(),
        meetingId: req.params.id,
        userId,
        role: role || 'PARTICIPANT',
        status: status || 'PENDING',
      },
      update: { role, status },
    });

    res.json(attendee);
  } catch (error) {
    logger.error('Add attendee error:', error);
    res.status(500).json({ error: 'Failed to add attendee' });
  }
});

// Update attendee status (RSVP)
router.put('/:id/rsvp', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status } = req.body;

    if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const attendee = await prisma.meetingAttendee.updateMany({
      where: {
        meetingId: req.params.id,
        userId: req.user.sub,
      },
      data: {
        status,
        responseAt: new Date(),
      },
    });

    if (attendee.count === 0) {
      return res.status(404).json({ error: 'You are not invited to this meeting' });
    }

    res.json({ message: 'RSVP updated' });
  } catch (error) {
    logger.error('RSVP error:', error);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

// Add action item
router.post('/:id/actions', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { text, userId, dueDate, priority } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Action text required' });
    }

    const action = await prisma.action.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        meetingId: req.params.id,
        userId: userId || req.user.sub,
        text,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
      },
    });

    res.status(201).json(action);
  } catch (error) {
    logger.error('Add action error:', error);
    res.status(500).json({ error: 'Failed to add action' });
  }
});

// Add comment
router.post('/:id/comments', withTenant, canAccessMeeting, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { content, parentId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content required' });
    }

    const comment = await prisma.comment.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        meetingId: req.params.id,
        userId: req.user.sub,
        entityType: 'meeting',
        entityId: req.params.id,
        content,
        parentId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
