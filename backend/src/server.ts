import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';

import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';

// Import all routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import meetingRoutes from './routes/meeting.routes';
import eventRoutes from './routes/event.routes';
import policyRoutes from './routes/policy.routes';
import searchRoutes from './routes/search.routes';
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';
import analyticsRoutes from './routes/analytics.routes';
import uploadRoutes from './routes/upload.routes';
import webhookRoutes from './routes/webhook.routes';
import aiRoutes from './routes/ai.routes';

// Load environment variables
dotenv.config();

class App {
  public app: Application;
  public httpServer: ReturnType<typeof createServer>;
  public io: SocketServer;
  private port: number;
  private apiPrefix: string;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
      },
    });
    this.port = parseInt(process.env.PORT || '4000', 10);
    this.apiPrefix = process.env.API_PREFIX || '/api/v1';

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: process.env.CORS_CREDENTIALS === 'true',
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.http(message.trim()),
        },
      })
    );
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    });

    // API routes
    this.app.use(`${this.apiPrefix}/auth`, authRoutes);
    this.app.use(`${this.apiPrefix}/users`, userRoutes);
    this.app.use(`${this.apiPrefix}/meetings`, meetingRoutes);
    this.app.use(`${this.apiPrefix}/events`, eventRoutes);
    this.app.use(`${this.apiPrefix}/policies`, policyRoutes);
    this.app.use(`${this.apiPrefix}/search`, searchRoutes);
    this.app.use(`${this.apiPrefix}/notifications`, notificationRoutes);
    this.app.use(`${this.apiPrefix}/audit`, auditRoutes);
    this.app.use(`${this.apiPrefix}/analytics`, analyticsRoutes);
    this.app.use(`${this.apiPrefix}/uploads`, uploadRoutes);
    this.app.use(`${this.apiPrefix}/webhooks`, webhookRoutes);
    this.app.use(`${this.apiPrefix}/ai`, aiRoutes);

    // WebSocket initialization
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    this.io.on('connection', (socket: any) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });

      // Join room for user-specific notifications
      socket.on('join:user', (userId: string) => {
        socket.join(`user:${userId}`);
        logger.info(`User ${userId} joined their notification room`);
      });

      // Join room for organization-wide broadcasts
      socket.on('join:organization', (orgId: string) => {
        socket.join(`org:${orgId}`);
        logger.info(`Joined organization room: ${orgId}`);
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database (optional in dev mode)
      if (process.env.SKIP_DATABASE !== 'true') {
        try {
          await connectDatabase();
          logger.info('Database connected successfully');
        } catch (error) {
          logger.warn('Database connection failed - running without database');
          logger.warn('Set SKIP_DATABASE=true in .env to suppress this warning');
        }
      }

      // Start server
      this.httpServer.listen(this.port, () => {
        logger.info(`Server is running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`API Base URL: http://localhost:${this.port}${this.apiPrefix}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down server gracefully...');
    
    // Close server
    this.httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connections
    // Add cleanup logic here

    process.exit(0);
  }
}

// Create and start server
const server = new App();

// Handle graceful shutdown
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Start the server
server.start();

export default server;
