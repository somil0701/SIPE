"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.ApiError = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
/**
 * Custom API Error class
 */
class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, code = 'BAD_REQUEST', details) {
        return new ApiError(400, message, code, details);
    }
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new ApiError(401, message, code);
    }
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new ApiError(403, message, code);
    }
    static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
        return new ApiError(404, message, code);
    }
    static conflict(message, code = 'CONFLICT') {
        return new ApiError(409, message, code);
    }
    static validation(message, details) {
        return new ApiError(422, message, 'VALIDATION_ERROR', details);
    }
    static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
        return new ApiError(429, message, code);
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, message, 'INTERNAL_ERROR');
    }
}
exports.ApiError = ApiError;
/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details;
    // Handle known error types
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code;
        details = err.details;
    }
    else if (err instanceof zod_1.ZodError) {
        // Zod validation errors
        statusCode = 422;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = {};
        err.errors.forEach((error) => {
            const path = error.path.join('.');
            if (!details[path]) {
                details[path] = [];
            }
            details[path].push(error.message);
        });
    }
    else if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        // Prisma known errors
        switch (err.code) {
            case 'P2002':
                statusCode = 409;
                message = 'Resource already exists';
                code = 'DUPLICATE_ENTRY';
                {
                    const target = err.meta?.target;
                    details = {
                        field: Array.isArray(target)
                            ? target.map(String)
                            : [String(target || 'unknown')],
                    };
                }
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Record not found';
                code = 'NOT_FOUND';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Foreign key constraint failed';
                code = 'FOREIGN_KEY_ERROR';
                break;
            default:
                logger_1.logger.error('Prisma error', { code: err.code, message: err.message });
        }
    }
    else if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
        code = 'VALIDATION_ERROR';
    }
    // Log error
    if (statusCode >= 500) {
        logger_1.logger.error('Server error', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            requestId: req.requestId,
        });
    }
    else {
        logger_1.logger.warn('Client error', {
            statusCode,
            message,
            code,
            path: req.path,
            method: req.method,
            requestId: req.requestId,
        });
    }
    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            ...(details && { details }),
        },
        ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
            stack: err.stack,
        }),
    });
};
exports.errorHandler = errorHandler;
/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map