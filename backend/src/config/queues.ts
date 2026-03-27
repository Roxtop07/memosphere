import Queue from 'bull';
import { logger } from '../utils/logger';

// Queue instances
export let emailQueue: Queue.Queue;
export let transcriptionQueue: Queue.Queue;
export let aiProcessingQueue: Queue.Queue;
export let reportGenerationQueue: Queue.Queue;
export let notificationQueue: Queue.Queue;

// Helper function to queue email jobs
export const queueEmail = async (data: any) => {
  return emailQueue.add(data);
};

const REDIS_CONFIG = {
  redis: {
    host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.BULL_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.BULL_REDIS_DB || '1', 10),
  },
};

export const initializeQueues = async (): Promise<void> => {
  try {
    // Email queue
    emailQueue = new Queue('email', REDIS_CONFIG);
    emailQueue.on('error', (error) => {
      logger.error('Email queue error:', error);
    });
    emailQueue.on('completed', (job) => {
      logger.info(`Email job ${job.id} completed`);
    });
    emailQueue.on('failed', (job, error) => {
      logger.error(`Email job ${job?.id} failed:`, error);
    });

    // Transcription queue
    transcriptionQueue = new Queue('transcription', REDIS_CONFIG);
    transcriptionQueue.on('error', (error) => {
      logger.error('Transcription queue error:', error);
    });
    transcriptionQueue.on('completed', (job) => {
      logger.info(`Transcription job ${job.id} completed`);
    });
    transcriptionQueue.on('failed', (job, error) => {
      logger.error(`Transcription job ${job?.id} failed:`, error);
    });

    // AI processing queue
    aiProcessingQueue = new Queue('ai-processing', REDIS_CONFIG);
    aiProcessingQueue.on('error', (error) => {
      logger.error('AI processing queue error:', error);
    });
    aiProcessingQueue.on('completed', (job) => {
      logger.info(`AI processing job ${job.id} completed`);
    });
    aiProcessingQueue.on('failed', (job, error) => {
      logger.error(`AI processing job ${job?.id} failed:`, error);
    });

    // Report generation queue
    reportGenerationQueue = new Queue('report-generation', REDIS_CONFIG);
    reportGenerationQueue.on('error', (error) => {
      logger.error('Report generation queue error:', error);
    });
    reportGenerationQueue.on('completed', (job) => {
      logger.info(`Report generation job ${job.id} completed`);
    });
    reportGenerationQueue.on('failed', (job, error) => {
      logger.error(`Report generation job ${job?.id} failed:`, error);
    });

    // Notification queue
    notificationQueue = new Queue('notification', REDIS_CONFIG);
    notificationQueue.on('error', (error) => {
      logger.error('Notification queue error:', error);
    });
    notificationQueue.on('completed', (job) => {
      logger.info(`Notification job ${job.id} completed`);
    });
    notificationQueue.on('failed', (job, error) => {
      logger.error(`Notification job ${job?.id} failed:`, error);
    });

    logger.info('All background queues initialized successfully');

    // Start queue processors
    await startQueueProcessors();
  } catch (error) {
    logger.error('Failed to initialize queues:', error);
    throw error;
  }
};

const startQueueProcessors = async (): Promise<void> => {
  // Disabled in dev mode - processors not implemented yet
  logger.info('Queue processors disabled in dev mode');
};

export const closeQueues = async (): Promise<void> => {
  const queues = [
    emailQueue,
    transcriptionQueue,
    aiProcessingQueue,
    reportGenerationQueue,
    notificationQueue,
  ];

  await Promise.all(
    queues.map(async (queue) => {
      if (queue) {
        await queue.close();
      }
    })
  );

  logger.info('All queues closed');
};
