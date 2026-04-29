import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './env';

/**
 * Winston Logger Configuration
 * 
 * Features:
 * - Structured JSON logging for production
 * - Human-readable format for development
 * - Daily log rotation
 * - Separate error logs
 * - Console output in development
 */

// Custom format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Custom format for production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
    })
  );
}

// File transports (enabled in all environments)
const logDir = 'logs';

// Combined log file with rotation
transports.push(
  new DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: prodFormat,
  })
);

// Error log file with rotation
transports.push(
  new DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: prodFormat,
  })
);

// Create logger
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  defaultMeta: {
    service: 'interview-prep-api',
    environment: env.NODE_ENV,
  },
  transports,
  // Don't exit on error
  exitOnError: false,
});

// Stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};