"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const env_1 = require("./env");
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
const devFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
}));
// Custom format for production (JSON)
const prodFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Transports
const transports = [];
// Console transport (always enabled in development)
if (env_1.env.NODE_ENV === 'development') {
    transports.push(new winston_1.default.transports.Console({
        format: devFormat,
    }));
}
// File transports (enabled in all environments)
const logDir = 'logs';
// Combined log file with rotation
transports.push(new winston_daily_rotate_file_1.default({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: prodFormat,
}));
// Error log file with rotation
transports.push(new winston_daily_rotate_file_1.default({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: prodFormat,
}));
// Create logger
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'development' ? 'debug' : 'info',
    defaultMeta: {
        service: 'interview-prep-api',
        environment: env_1.env.NODE_ENV,
    },
    transports,
    // Don't exit on error
    exitOnError: false,
});
// Stream for Morgan HTTP logging
exports.morganStream = {
    write: (message) => {
        exports.logger.info(message.trim());
    },
};
//# sourceMappingURL=logger.js.map