import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './errorHandler';

/**
 * Validation middleware factory
 * Validates request body, query, or params against Zod schema
 */

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Record<string, string[]> = {};

      // Validate body
      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = err.path.join('.');
              if (!errors[`body.${path}`]) {
                errors[`body.${path}`] = [];
              }
              errors[`body.${path}`].push(err.message);
            });
          }
        }
      }

      // Validate query
      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = err.path.join('.');
              if (!errors[`query.${path}`]) {
                errors[`query.${path}`] = [];
              }
              errors[`query.${path}`].push(err.message);
            });
          }
        }
      }

      // Validate params
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            error.errors.forEach((err) => {
              const path = err.path.join('.');
              if (!errors[`params.${path}`]) {
                errors[`params.${path}`] = [];
              }
              errors[`params.${path}`].push(err.message);
            });
          }
        }
      }

      // If there are validation errors, throw ApiError
      if (Object.keys(errors).length > 0) {
        throw ApiError.validation('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */

import { z } from 'zod';

export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
  }),

  // UUID param
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Email
  email: z.string().email('Invalid email format'),

  // Password (strong)
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Difficulty
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),

  // Programming language
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']),
};
