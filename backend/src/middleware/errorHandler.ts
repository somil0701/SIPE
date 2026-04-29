import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: Record<string, string[]>): ApiError {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = 'CONFLICT'): ApiError {
    return new ApiError(409, message, code);
  }

  static validation(message: string, details: Record<string, string[]>): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED'): ApiError {
    return new ApiError(429, message, code);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: Record<string, string[]> | undefined;

  // Handle known error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof ZodError) {
    // Zod validation errors
    statusCode = 422;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!details![path]) {
        details![path] = [];
      }
      details![path].push(error.message);
    });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
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
        logger.error('Prisma error', { code: err.code, message: err.message });
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
    });
  } else {
    logger.warn('Client error', {
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

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
