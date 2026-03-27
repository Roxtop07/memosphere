import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { withTenant, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Universal search across all entities
router.get('/', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { q, type, limit = '20' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const limitNum = Math.min(parseInt(limit as string), 50);
    const searchTerm = q.toLowerCase();

    const results: any = {
      meetings: [],
      events: [],
      policies: [],
      users: [],
    };

    // Build base where clause for org filtering
    const orgFilter = { orgId: req.user.orgId };

    // Search based on type or all
    const searchTypes = type ? [type as string] : ['meetings', 'events', 'policies', 'users'];

    // Search meetings
    if (searchTypes.includes('meetings')) {
      const meetingsWhere: any = {
        ...orgFilter,
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { agenda: { contains: searchTerm } },
        ],
      };

      // Role-based filtering
      if (req.user!.role === 'MEMBER' || req.user!.role === 'GUEST') {
        meetingsWhere.AND = {
          OR: [
            { createdById: req.user!.sub },
            { attendees: { some: { userId: req.user!.sub } } },
            { isPrivate: false },
          ],
        };
      }

      results.meetings = await prisma.meeting.findMany({
        where: meetingsWhere,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          startTime: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: limitNum,
        orderBy: { startTime: 'desc' },
      });
    }

    // Search events
    if (searchTypes.includes('events')) {
      const eventsWhere: any = {
        ...orgFilter,
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { location: { contains: searchTerm } },
        ],
      };

      // Role-based filtering
      if (req.user!.role === 'MEMBER' || req.user!.role === 'GUEST') {
        eventsWhere.AND = {
          OR: [
            { createdById: req.user!.sub },
            { isPublic: true },
            { attendees: { some: { userId: req.user!.sub } } },
          ],
        };
      }

      results.events = await prisma.event.findMany({
        where: eventsWhere,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          startDate: true,
          location: true,
          isPublic: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: limitNum,
        orderBy: { startDate: 'desc' },
      });
    }

    // Search policies
    if (searchTypes.includes('policies')) {
      const policiesWhere: any = {
        ...orgFilter,
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { content: { contains: searchTerm } },
        ],
      };

      // Role-based filtering
      if (req.user!.role === 'GUEST') {
        policiesWhere.AND = { isPublic: true, status: 'ACTIVE' };
      } else if (req.user!.role === 'MEMBER') {
        policiesWhere.AND = {
          OR: [{ status: 'ACTIVE' }, { createdById: req.user!.sub }],
        };
      }

      results.policies = await prisma.policy.findMany({
        where: policiesWhere,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          version: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
      });
    }

    // Search users (admin and organizer only)
    if (searchTypes.includes('users') && (req.user!.role === 'ADMIN' || req.user!.role === 'ORGANIZER')) {
      results.users = await prisma.user.findMany({
        where: {
          ...orgFilter,
          isActive: true,
          OR: [
            { email: { contains: searchTerm } },
            { firstName: { contains: searchTerm } },
            { lastName: { contains: searchTerm } },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
        },
        take: limitNum,
      });
    }

    // Calculate relevance scores and combine results
    const scoredResults: any[] = [];

    // Score and add meetings
    results.meetings.forEach((m: any) => {
      const score = calculateRelevance(searchTerm, [m.title, m.description, m.agenda]);
      scoredResults.push({
        type: 'meeting',
        id: m.id,
        title: m.title,
        subtitle: m.description?.substring(0, 100),
        metadata: { status: m.status, date: m.startsAt },
        score,
        data: m,
      });
    });

    // Score and add events
    results.events.forEach((e: any) => {
      const score = calculateRelevance(searchTerm, [e.title, e.description, e.location]);
      scoredResults.push({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.description?.substring(0, 100),
        metadata: { status: e.status, date: e.startDate, location: e.location },
        score,
        data: e,
      });
    });

    // Score and add policies
    results.policies.forEach((p: any) => {
      const score = calculateRelevance(searchTerm, [p.title, p.description, p.content]);
      scoredResults.push({
        type: 'policy',
        id: p.id,
        title: p.title,
        subtitle: p.description?.substring(0, 100),
        metadata: { status: p.status, version: p.version },
        score,
        data: p,
      });
    });

    // Score and add users
    results.users.forEach((u: any) => {
      const fullName = `${u.firstName} ${u.lastName}`;
      const score = calculateRelevance(searchTerm, [u.email, fullName]);
      scoredResults.push({
        type: 'user',
        id: u.id,
        title: fullName,
        subtitle: u.email,
        metadata: { role: u.role },
        score,
        data: u,
      });
    });

    // Sort by relevance score
    scoredResults.sort((a, b) => b.score - a.score);

    res.json({
      query: q,
      results: scoredResults.slice(0, limitNum),
      counts: {
        meetings: results.meetings.length,
        events: results.events.length,
        policies: results.policies.length,
        users: results.users.length,
        total: scoredResults.length,
      },
    });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search suggestions/autocomplete
router.get('/suggest', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { q, limit = '5' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 1) {
      return res.status(400).json({ suggestions: [] });
    }

    const limitNum = Math.min(parseInt(limit as string), 10);
    const searchTerm = q.toLowerCase();

    const suggestions: string[] = [];

    // Get meeting titles
    const meetings = await prisma.meeting.findMany({
      where: {
        orgId: req.user.orgId,
        title: { contains: searchTerm },
      },
      select: { title: true },
      take: limitNum,
    });
    meetings.forEach((m) => suggestions.push(m.title));

    // Get event titles
    const events = await prisma.event.findMany({
      where: {
        orgId: req.user.orgId,
        title: { contains: searchTerm },
      },
      select: { title: true },
      take: limitNum,
    });
    events.forEach((e) => suggestions.push(e.title));

    // Get policy titles
    const policies = await prisma.policy.findMany({
      where: {
        orgId: req.user.orgId,
        title: { contains: searchTerm },
      },
      select: { title: true },
      take: limitNum,
    });
    policies.forEach((p) => suggestions.push(p.title));

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, limitNum);

    res.json({ suggestions: uniqueSuggestions });
  } catch (error) {
    logger.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Recent searches (stored client-side, this returns popular searches)
router.get('/popular', withTenant, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Return popular/recent entity names as popular searches
    const [meetings, events, policies] = await Promise.all([
      prisma.meeting.findMany({
        where: { orgId: req.user.orgId },
        select: { title: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.event.findMany({
        where: { orgId: req.user.orgId },
        select: { title: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.policy.findMany({
        where: { orgId: req.user.orgId, status: 'ACTIVE' },
        select: { title: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      popular: [
        ...meetings.map((m) => ({ type: 'meeting', title: m.title })),
        ...events.map((e) => ({ type: 'event', title: e.title })),
        ...policies.map((p) => ({ type: 'policy', title: p.title })),
      ].slice(0, 10),
    });
  } catch (error) {
    logger.error('Popular searches error:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

// Helper function to calculate search relevance
function calculateRelevance(query: string, fields: (string | null | undefined)[]): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  for (const field of fields) {
    if (!field) continue;
    const fieldLower = field.toLowerCase();

    // Exact match bonus
    if (fieldLower === queryLower) {
      score += 100;
    }

    // Starts with bonus
    if (fieldLower.startsWith(queryLower)) {
      score += 50;
    }

    // Contains bonus
    if (fieldLower.includes(queryLower)) {
      score += 25;
    }

    // Word match bonus
    for (const word of queryWords) {
      if (fieldLower.includes(word)) {
        score += 10;
      }
    }

    // Frequency bonus (how many times query appears)
    const matches = fieldLower.split(queryLower).length - 1;
    score += matches * 5;
  }

  return score;
}

export default router;
