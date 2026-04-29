"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("dotenv/config");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const errorHandler_1 = require("./middleware/errorHandler");
const requestId_1 = require("./middleware/requestId");
// Import routes
const auth_routes_1 = require("./routes/auth.routes");
const user_routes_1 = require("./routes/user.routes");
const question_routes_1 = require("./routes/question.routes");
const attempt_routes_1 = require("./routes/attempt.routes");
const interview_routes_1 = require("./routes/interview.routes");
const resume_routes_1 = require("./routes/resume.routes");
const analytics_routes_1 = require("./routes/analytics.routes");
const learning_path_routes_1 = require("./routes/learning-path.routes");
const spaced_repetition_routes_1 = require("./routes/spaced-repetition.routes");
// Initialize Express app
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.env.CORS_ORIGIN,
        credentials: true,
    },
});
exports.io = io;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env_1.env.RATE_LIMIT_MAX,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Stricter rate limit for auth endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.',
    },
});
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use((0, compression_1.default)());
// Logging
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger_1.logger.info(message.trim()),
    },
}));
// Request ID
app.use(requestId_1.requestId);
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
        await database_1.prisma.$queryRaw `SELECT 1`;
        healthcheck.services.database = 'connected';
    }
    catch (error) {
        healthcheck.services.database = 'disconnected';
        logger_1.logger.error('Database health check failed', { error });
    }
    try {
        // Check Redis
        await redis_1.redis.ping();
        healthcheck.services.redis = 'connected';
    }
    catch (error) {
        healthcheck.services.redis = 'disconnected';
        logger_1.logger.error('Redis health check failed', { error });
    }
    const isHealthy = healthcheck.services.database === 'connected' &&
        healthcheck.services.redis === 'connected';
    res.status(isHealthy ? 200 : 503).json(healthcheck);
});
// API Routes
app.use('/api/v1/auth', authLimiter, auth_routes_1.authRouter);
app.use('/api/v1/users', user_routes_1.userRouter);
app.use('/api/v1/questions', question_routes_1.questionRouter);
app.use('/api/v1/attempts', attempt_routes_1.attemptRouter);
app.use('/api/v1/interviews', interview_routes_1.interviewRouter);
app.use('/api/v1/resumes', resume_routes_1.resumeRouter);
app.use('/api/v1/analytics', analytics_routes_1.analyticsRouter);
app.use('/api/v1/learning-paths', learning_path_routes_1.learningPathRouter);
app.use('/api/v1/spaced-repetition', spaced_repetition_routes_1.spacedRepetitionRouter);
// Socket.IO connection handling
io.on('connection', (socket) => {
    logger_1.logger.info(`Client connected: ${socket.id}`);
    // Join user-specific room for personalized updates
    socket.on('authenticate', (userId) => {
        socket.join(`user:${userId}`);
        logger_1.logger.info(`User ${userId} joined their room`);
    });
    // Join interview room
    socket.on('join-interview', (interviewId) => {
        socket.join(`interview:${interviewId}`);
        logger_1.logger.info(`Socket ${socket.id} joined interview ${interviewId}`);
    });
    // Leave interview room
    socket.on('leave-interview', (interviewId) => {
        socket.leave(`interview:${interviewId}`);
        logger_1.logger.info(`Socket ${socket.id} left interview ${interviewId}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Client disconnected: ${socket.id}`);
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
app.use(errorHandler_1.errorHandler);
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`${signal} received. Starting graceful shutdown...`);
    // Close HTTP server
    httpServer.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
    // Close Socket.IO
    io.close(() => {
        logger_1.logger.info('Socket.IO server closed');
    });
    // Disconnect from database
    await database_1.prisma.$disconnect();
    logger_1.logger.info('Database connection closed');
    // Close Redis connection
    await redis_1.redis.quit();
    logger_1.logger.info('Redis connection closed');
    process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', { error });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection', { reason, promise });
});
// Start server
const PORT = env_1.env.PORT;
httpServer.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT} in ${env_1.env.NODE_ENV} mode`);
    logger_1.logger.info(`API Documentation: http://localhost:${PORT}/api/v1`);
});
//# sourceMappingURL=server.js.map