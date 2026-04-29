import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';

// Import routes
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { questionRouter } from './routes/question.routes';
import { attemptRouter } from './routes/attempt.routes';
import { interviewRouter } from './routes/interview.routes';
import { resumeRouter } from './routes/resume.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { learningPathRouter } from './routes/learning-path.routes';
import { spacedRepetitionRouter } from './routes/spaced-repetition.routes';
import { adminRoutes } from './routes/admin.routes';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Request ID
app.use(requestId);

// Health check endpoint (before auth)
app.get('/health', async (_req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    healthcheck.services.database = 'connected';
  } catch (error) {
    healthcheck.services.database = 'disconnected';
    logger.error('Database health check failed', { error });
  }

  try {
    // Check Redis
    await redis.ping();
    healthcheck.services.redis = 'connected';
  } catch (error) {
    healthcheck.services.redis = 'disconnected';
    logger.error('Redis health check failed', { error });
  }

  const isHealthy = healthcheck.services.database === 'connected' && 
                    healthcheck.services.redis === 'connected';

  res.status(isHealthy ? 200 : 503).json(healthcheck);
});

// API Routes
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/attempts', attemptRouter);
app.use('/api/v1/interviews', interviewRouter);
app.use('/api/v1/resumes', resumeRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/learning-paths', learningPathRouter);
app.use('/api/v1/spaced-repetition', spacedRepetitionRouter);
app.use('/api/v1/admin', adminRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join user-specific room for personalized updates
  socket.on('authenticate', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  // Join interview room
  socket.on('join-interview', (interviewId: string) => {
    socket.join(`interview:${interviewId}`);
    logger.info(`Socket ${socket.id} joined interview ${interviewId}`);
  });

  // Leave interview room
  socket.on('leave-interview', (interviewId: string) => {
    socket.leave(`interview:${interviewId}`);
    logger.info(`Socket ${socket.id} left interview ${interviewId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close Socket.IO
  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  // Disconnect from database
  await prisma.$disconnect();
  logger.info('Database connection closed');

  // Close Redis connection
  await redis.quit();
  logger.info('Redis connection closed');

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Start server
const PORT = env.PORT;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`API Documentation: http://localhost:${PORT}/api/v1`);
});

export { io };
