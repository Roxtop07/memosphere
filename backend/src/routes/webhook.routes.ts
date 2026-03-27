import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { prisma } from '../config/database';
import { withTenant, requireRole, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Generate webhook secret
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

// Sign webhook payload
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Create webhook
router.post('/', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, url, events, description } = req.body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Name, url, and events array are required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }

    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        id: uuidv4(),
        orgId: req.user.orgId,
        name,
        url,
        secret,
        events: JSON.stringify(events),
        description: description || null,
        isActive: true,
        createdById: req.user.sub,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    logger.info(`Webhook created: ${name} for org ${req.user.orgId}`);

    res.status(201).json({
      ...webhook,
      events: JSON.parse(webhook.events),
      secret, // Only shown once on creation
    });
  } catch (error) {
    logger.error('Create webhook error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// List webhooks
router.get('/', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhooks = await prisma.webhook.findMany({
      where: { orgId: req.user.orgId },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        events: JSON.parse(w.events),
        description: w.description,
        isActive: w.isActive,
        lastTriggeredAt: w.lastTriggeredAt,
        failureCount: w.failureCount,
        createdBy: w.createdBy,
        createdAt: w.createdAt,
      })),
    });
  } catch (error) {
    logger.error('List webhooks error:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// Get webhook by ID
router.get('/:id', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      ...webhook,
      events: JSON.parse(webhook.events),
      secret: undefined, // Don't expose secret
    });
  } catch (error) {
    logger.error('Get webhook error:', error);
    res.status(500).json({ error: 'Failed to get webhook' });
  }
});

// Update webhook
router.put('/:id', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const { name, url, events, description, isActive } = req.body;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid webhook URL' });
      }
    }

    const updated = await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        name: name || webhook.name,
        url: url || webhook.url,
        events: events ? JSON.stringify(events) : webhook.events,
        description: description !== undefined ? description : webhook.description,
        isActive: isActive !== undefined ? isActive : webhook.isActive,
        updatedAt: new Date(),
      },
    });

    res.json({
      ...updated,
      events: JSON.parse(updated.events),
      secret: undefined,
    });
  } catch (error) {
    logger.error('Update webhook error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// Delete webhook
router.delete('/:id', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await prisma.webhook.delete({ where: { id: webhook.id } });

    logger.info(`Webhook deleted: ${webhook.name}`);

    res.json({ message: 'Webhook deleted' });
  } catch (error) {
    logger.error('Delete webhook error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Regenerate webhook secret
router.post('/:id/regenerate-secret', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const newSecret = generateWebhookSecret();

    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { secret: newSecret },
    });

    logger.info(`Webhook secret regenerated for: ${webhook.name}`);

    res.json({ secret: newSecret });
  } catch (error) {
    logger.error('Regenerate secret error:', error);
    res.status(500).json({ error: 'Failed to regenerate secret' });
  }
});

// Test webhook
router.post('/:id/test', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: req.params.id,
        orgId: req.user.orgId,
      },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = signPayload(payloadString, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
        },
        body: payloadString,
      });

      if (response.ok) {
        res.json({
          success: true,
          statusCode: response.status,
          message: 'Test webhook delivered successfully',
        });
      } else {
        res.json({
          success: false,
          statusCode: response.status,
          message: `Webhook returned status ${response.status}`,
        });
      }
    } catch (fetchError: any) {
      res.json({
        success: false,
        message: `Failed to deliver: ${fetchError.message}`,
      });
    }
  } catch (error) {
    logger.error('Test webhook error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// Get available webhook events
router.get('/events/list', withTenant, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const events = [
    { event: 'meeting.created', description: 'When a new meeting is created' },
    { event: 'meeting.updated', description: 'When a meeting is updated' },
    { event: 'meeting.deleted', description: 'When a meeting is deleted' },
    { event: 'meeting.started', description: 'When a meeting starts' },
    { event: 'meeting.ended', description: 'When a meeting ends' },
    { event: 'event.created', description: 'When a new event is created' },
    { event: 'event.updated', description: 'When an event is updated' },
    { event: 'event.deleted', description: 'When an event is deleted' },
    { event: 'event.registration', description: 'When someone registers for an event' },
    { event: 'policy.created', description: 'When a new policy is created' },
    { event: 'policy.updated', description: 'When a policy is updated' },
    { event: 'policy.published', description: 'When a policy is published' },
    { event: 'user.created', description: 'When a new user is created' },
    { event: 'user.updated', description: 'When a user is updated' },
    { event: 'user.deleted', description: 'When a user is deleted' },
  ];

  res.json({ events });
});

// Utility function to trigger webhooks (for internal use)
export async function triggerWebhooks(orgId: string, event: string, data: any) {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        orgId,
        isActive: true,
      },
    });

    for (const webhook of webhooks) {
      const events = JSON.parse(webhook.events);
      if (!events.includes(event) && !events.includes('*')) {
        continue;
      }

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString, webhook.secret);

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
          },
          body: payloadString,
        });

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: response.ok ? 0 : webhook.failureCount + 1,
          },
        });

        logger.info(`Webhook ${webhook.name} triggered for event ${event}: ${response.status}`);
      } catch (error: any) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { failureCount: webhook.failureCount + 1 },
        });

        logger.error(`Webhook ${webhook.name} failed: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error('Trigger webhooks error:', error);
  }
}

export default router;
