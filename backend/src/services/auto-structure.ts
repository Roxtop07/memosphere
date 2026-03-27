import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface MeetingProcessingResult {
  meetingId: string;
  summary: string;
  detectedSeries?: string;
  actions: Array<{
    text: string;
    assignee?: string;
    dueDate?: Date;
  }>;
  pdfUrl?: string;
}

/**
 * Main auto-structuring pipeline
 * Called when meeting ends or on-demand
 */
export async function processMeetingEnd(meetingId: string): Promise<MeetingProcessingResult> {
  try {
    logger.info(`Starting auto-structuring for meeting: ${meetingId}`);
    
    // 1. Get meeting data
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        organization: true,
        attendees: {
          include: {
            user: true,
          },
        },
      },
    });
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }
    
    // 2. Get transcript
    const transcript = meeting.transcript || '';
    
    // 3. Generate AI summary
    const summary = await generateSummary(transcript, meeting.title);
    
    // 4. Extract action items
    const actions = await extractActionItems(transcript, meeting);
    
    // 5. Store results
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        summary,
        status: 'COMPLETED',
      },
    });
    
    // 6. Store actions
    for (const action of actions) {
      await createAction(action, meeting.orgId, meetingId);
    }
    
    // 7. Send notifications to attendees
    await notifyAttendees(meeting, summary, actions);
    
    // 8. Create audit log
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: meeting.orgId,
        userId: meeting.createdById,
        action: 'meeting:auto_structured',
        entityType: 'meeting',
        entityId: meetingId,
        metadata: JSON.stringify({
          actionsCount: actions.length,
          pdfGenerated: false,
        }),
      },
    });
    
    logger.info(`Completed auto-structuring for meeting: ${meetingId}`);
    
    return {
      meetingId,
      summary,
      actions,
    };
  } catch (error) {
    logger.error(`Auto-structuring failed for meeting ${meetingId}:`, error);
    throw error;
  }
}

/**
 * Generate AI summary using OpenAI/Azure OpenAI
 */
async function generateSummary(transcript: string, title: string): Promise<string> {
  if (!transcript || transcript.length < 50) {
    return 'No substantial content to summarize.';
  }
  
  // Mock AI summary (replace with actual OpenAI call)
  const wordCount = transcript.split(' ').length;
  const estimatedDuration = Math.ceil(wordCount / 150); // ~150 words per minute
  
  return `
## Meeting Summary

**Topic:** ${title}
**Duration:** ~${estimatedDuration} minutes

### Key Discussion Points
- Main discussion topics from the meeting
- Important decisions made
- Concerns or issues raised

### Decisions Made
- Decision 1
- Decision 2

### Next Steps
- Follow-up actions required
- Scheduled follow-up meetings
`.trim();
}

/**
 * Extract action items from transcript
 */
async function extractActionItems(
  transcript: string,
  _meeting: any
): Promise<Array<{ text: string; assignee?: string; dueDate?: Date }>> {
  if (!transcript) return [];
  
  const actions: Array<{ text: string; assignee?: string; dueDate?: Date }> = [];
  const lines = transcript.split('\n');
  
  const actionKeywords = ['action:', 'todo:', 'task:', 'follow up:', 'action item:'];
  
  for (const line of lines) {
    const lineLower = line.toLowerCase().trim();
    
    if (actionKeywords.some(kw => lineLower.startsWith(kw))) {
      const text = line.replace(/^(action|todo|task|follow up|action item):/i, '').trim();
      
      if (text.length > 5) {
        const assigneeMatch = text.match(/@(\w+)/);
        const assignee = assigneeMatch ? assigneeMatch[1] : undefined;
        
        const dateMatch = text.match(/by (\w+ \d+|\d+\/\d+)/i);
        const dueDate = dateMatch ? parseDateString(dateMatch[1]) : undefined;
        
        actions.push({
          text: text.replace(/@\w+/g, '').replace(/by \w+ \d+/gi, '').trim(),
          assignee,
          dueDate,
        });
      }
    }
  }
  
  return actions;
}

/**
 * Create action item
 */
async function createAction(
  action: { text: string; assignee?: string; dueDate?: Date },
  orgId: string,
  meetingId: string
): Promise<any> {
  // Find assignee user ID if specified
  let userId: string | undefined;
  if (action.assignee) {
    const user = await prisma.user.findFirst({
      where: {
        orgId,
        OR: [
          { email: { contains: action.assignee } },
          { firstName: { contains: action.assignee } },
          { lastName: { contains: action.assignee } },
        ],
      },
    });
    userId = user?.id;
  }
  
  // If no user found, use a default
  if (!userId) {
    const firstUser = await prisma.user.findFirst({ where: { orgId } });
    userId = firstUser?.id || orgId;
  }
  
  return prisma.action.create({
    data: {
      id: crypto.randomUUID(),
      orgId,
      meetingId,
      userId,
      text: action.text,
      dueDate: action.dueDate,
      status: 'PENDING',
      priority: 'MEDIUM',
    },
  });
}

/**
 * Notify attendees about meeting summary
 */
async function notifyAttendees(
  meeting: any,
  summary: string,
  actions: Array<any>
): Promise<void> {
  for (const attendee of meeting.attendees) {
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        orgId: meeting.orgId,
        userId: attendee.userId,
        type: 'MEETING_SUMMARY',
        title: `Meeting Summary: ${meeting.title}`,
        message: `${actions.length} action item(s) extracted from the meeting.`,
        data: JSON.stringify({
          meetingId: meeting.id,
          summary: summary.substring(0, 200),
        }),
      },
    });
  }
}

/**
 * Parse date string to Date object
 */
function parseDateString(dateStr: string): Date | undefined {
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
}

/**
 * Anomaly detection for audit logs
 */
export async function detectAnomalies(orgId: string): Promise<void> {
  // Get recent audit logs
  const logs = await prisma.auditLog.findMany({
    where: {
      orgId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  // Detect suspicious patterns
  const userActions = new Map<string, number>();
  const ipAddresses = new Map<string, Set<string>>();
  
  for (const log of logs) {
    if (!log.userId) continue;
    
    // Count actions per user
    const count = userActions.get(log.userId) || 0;
    userActions.set(log.userId, count + 1);
    
    // Track IPs per user
    if (log.ipAddress) {
      if (!ipAddresses.has(log.userId)) {
        ipAddresses.set(log.userId, new Set());
      }
      ipAddresses.get(log.userId)!.add(log.ipAddress);
    }
  }
  
  // Alert on anomalies
  for (const [userId, count] of userActions) {
    if (count > 1000) {
      logger.warn(`Anomaly detected: User ${userId} performed ${count} actions in 24h`);
      
      // Create alert notification for admins
      const admins = await prisma.user.findMany({
        where: { orgId, role: 'ADMIN' },
      });
      
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            userId: admin.id,
            title: 'Suspicious Activity Detected',
            message: `User ${userId} performed ${count} actions in the last 24 hours.`,
            type: 'SECURITY_ALERT',
          },
        });
      }
    }
  }
  
  // Check for multiple IP addresses
  for (const [userId, ips] of ipAddresses) {
    if (ips.size > 10) {
      logger.warn(`Anomaly detected: User ${userId} accessed from ${ips.size} different IPs`);
    }
  }
}
