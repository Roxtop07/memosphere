import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get dashboard overview stats
router.get('/dashboard', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const orgId = req.user.orgId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalMeetings,
      monthlyMeetings,
      weeklyMeetings,
      upcomingMeetings,
      totalEvents,
      upcomingEvents,
      totalPolicies,
      activePolicies,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      prisma.meeting.count({ where: { orgId } }),
      prisma.meeting.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
      prisma.meeting.count({ where: { orgId, createdAt: { gte: startOfWeek } } }),
      prisma.meeting.count({ where: { orgId, startTime: { gte: now }, status: { not: 'CANCELLED' } } }),
      prisma.event.count({ where: { orgId } }),
      prisma.event.count({ where: { orgId, startDate: { gte: now }, status: { not: 'CANCELLED' } } }),
      prisma.policy.count({ where: { orgId } }),
      prisma.policy.count({ where: { orgId, status: 'PUBLISHED' } }),
      prisma.user.count({ where: { orgId } }),
      prisma.user.count({ where: { orgId, isActive: true } }),
    ]);

    res.json({
      meetings: {
        total: totalMeetings,
        thisMonth: monthlyMeetings,
        thisWeek: weeklyMeetings,
        upcoming: upcomingMeetings,
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
      },
      policies: {
        total: totalPolicies,
        active: activePolicies,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get meeting analytics
router.get('/meetings', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Meetings by status
    const statusCounts = await prisma.meeting.groupBy({
      by: ['status'],
      where: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      _count: { status: true },
    });

    // Meetings by type
    const typeCounts = await prisma.meeting.groupBy({
      by: ['type'],
      where: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      _count: { type: true },
    });

    // Average duration (completed meetings)
    const completedMeetings = await prisma.meeting.findMany({
      where: {
        orgId: req.user.orgId,
        status: 'COMPLETED',
        actualStartTime: { not: null },
        actualEndTime: { not: null },
      },
      select: { actualStartTime: true, actualEndTime: true },
    });

    let avgDuration = 0;
    if (completedMeetings.length > 0) {
      const totalDuration = completedMeetings.reduce((sum, m) => {
        if (m.actualStartTime && m.actualEndTime) {
          return sum + (m.actualEndTime.getTime() - m.actualStartTime.getTime());
        }
        return sum;
      }, 0);
      avgDuration = Math.round(totalDuration / completedMeetings.length / 60000); // in minutes
    }

    // Attendance rate
    const attendanceData = await prisma.meetingAttendee.groupBy({
      by: ['status'],
      where: {
        meeting: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      },
      _count: { status: true },
    });

    // Meetings per day trend
    const dailyMeetings: { date: string; count: number }[] = [];
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.meeting.count({
        where: {
          orgId: req.user.orgId,
          startTime: { gte: date, lt: nextDate },
        },
      });

      dailyMeetings.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    res.json({
      period: { days, start: startDate },
      byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
      byType: typeCounts.map((t) => ({ type: t.type, count: t._count.type })),
      averageDurationMinutes: avgDuration,
      attendance: attendanceData.map((a) => ({ status: a.status, count: a._count.status })),
      dailyTrend: dailyMeetings.reverse(),
    });
  } catch (error) {
    logger.error('Get meeting analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting analytics' });
  }
});

// Get event analytics
router.get('/events', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Events by status
    const statusCounts = await prisma.event.groupBy({
      by: ['status'],
      where: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      _count: { status: true },
    });

    // Events by type
    const typeCounts = await prisma.event.groupBy({
      by: ['type'],
      where: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      _count: { type: true },
    });

    // Registration stats
    const events = await prisma.event.findMany({
      where: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      include: {
        _count: { select: { attendees: true } },
      },
    });

    const totalRegistrations = events.reduce((sum, e) => sum + e._count.attendees, 0);
    const avgRegistrations = events.length > 0 ? Math.round(totalRegistrations / events.length) : 0;

    // Check-in rate
    const checkedIn = await prisma.eventAttendee.count({
      where: {
        event: { orgId: req.user.orgId, createdAt: { gte: startDate } },
        checkedInAt: { not: null },
      },
    });

    const totalAttendees = await prisma.eventAttendee.count({
      where: {
        event: { orgId: req.user.orgId, createdAt: { gte: startDate } },
      },
    });

    const checkInRate = totalAttendees > 0 ? Math.round((checkedIn / totalAttendees) * 100) : 0;

    res.json({
      period: { days, start: startDate },
      byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
      byType: typeCounts.map((t) => ({ type: t.type, count: t._count.type })),
      registrations: {
        total: totalRegistrations,
        average: avgRegistrations,
      },
      checkInRate: `${checkInRate}%`,
    });
  } catch (error) {
    logger.error('Get event analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch event analytics' });
  }
});

// Get policy analytics
router.get('/policies', withTenant, requireRole('ADMIN', 'ORGANIZER'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Policies by status
    const statusCounts = await prisma.policy.groupBy({
      by: ['status'],
      where: { orgId: req.user.orgId },
      _count: { status: true },
    });

    // Policies by category
    const categoryCounts = await prisma.policy.groupBy({
      by: ['category'],
      where: { orgId: req.user.orgId },
      _count: { category: true },
    });

    // Recently updated
    const recentlyUpdated = await prisma.policy.findMany({
      where: { orgId: req.user.orgId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    });

    // Expiring soon (next 30 days)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringSoon = await prisma.policy.findMany({
      where: {
        orgId: req.user.orgId,
        effectiveEndDate: { lte: thirtyDaysLater, gte: new Date() },
      },
      select: { id: true, title: true, effectiveEndDate: true },
    });

    res.json({
      byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
      byCategory: categoryCounts.map((c) => ({ category: c.category, count: c._count.category })),
      recentlyUpdated,
      expiringSoon,
    });
  } catch (error) {
    logger.error('Get policy analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch policy analytics' });
  }
});

// Get user analytics
router.get('/users', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Users by role
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { orgId: req.user.orgId },
      _count: { role: true },
    });

    // Users by department
    const deptCounts = await prisma.user.groupBy({
      by: ['departmentId'],
      where: { orgId: req.user.orgId },
      _count: { departmentId: true },
    });

    // Get department names
    const deptIds = deptCounts.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });

    // Active vs inactive
    const activeCounts = await prisma.user.groupBy({
      by: ['isActive'],
      where: { orgId: req.user.orgId },
      _count: { isActive: true },
    });

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await prisma.user.count({
      where: { orgId: req.user.orgId, createdAt: { gte: startOfMonth } },
    });

    // Recent logins
    const recentLogins = await prisma.user.findMany({
      where: { orgId: req.user.orgId, lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      take: 10,
      select: { id: true, email: true, firstName: true, lastName: true, lastLoginAt: true },
    });

    res.json({
      byRole: roleCounts.map((r) => ({ role: r.role, count: r._count.role })),
      byDepartment: deptCounts.map((d) => {
        const dept = departments.find((dep) => dep.id === d.departmentId);
        return {
          departmentId: d.departmentId,
          departmentName: dept?.name || 'No Department',
          count: d._count.departmentId,
        };
      }),
      activeStatus: activeCounts.map((a) => ({
        isActive: a.isActive,
        count: a._count.isActive,
      })),
      newUsersThisMonth,
      recentLogins,
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Get activity timeline
router.get('/activity', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string), 50);

    const [recentMeetings, recentEvents, recentPolicies] = await Promise.all([
      prisma.meeting.findMany({
        where: { orgId: req.user.orgId },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.event.findMany({
        where: { orgId: req.user.orgId },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.policy.findMany({
        where: { orgId: req.user.orgId },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    // Combine and sort by date
    const activities = [
      ...recentMeetings.map((m) => ({
        type: 'meeting',
        id: m.id,
        title: m.title,
        status: m.status,
        createdAt: m.createdAt,
        createdBy: m.createdBy,
      })),
      ...recentEvents.map((e) => ({
        type: 'event',
        id: e.id,
        title: e.title,
        status: e.status,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
      })),
      ...recentPolicies.map((p) => ({
        type: 'policy',
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
        createdBy: p.createdBy,
      })),
    ];

    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ activities: activities.slice(0, limitNum) });
  } catch (error) {
    logger.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
