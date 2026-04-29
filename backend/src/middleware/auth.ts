import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { ApiError } from './errorHandler';
import { JwtPayload } from '../types';

/**
 * Extend Express Request type to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isPremium: boolean;
      };
      requestId?: string;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
      }
      throw ApiError.unauthorized('Token verification failed');
    }

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isPremium: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isPremium: true,
          deletedAt: true,
        },
      });

      if (user && !user.deletedAt) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          isPremium: user.isPremium,
        };
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Premium feature middleware
 * Checks if user has premium access
 */
export const requirePremium = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  if (!req.user.isPremium && req.user.role !== 'admin') {
    next(ApiError.forbidden('Premium subscription required', 'PREMIUM_REQUIRED'));
    return;
  }

  next();
};

/**
 * Parse a JWT duration string like "7d", "24h", "60m", "3600s" or a plain number
 * and return the equivalent number of seconds.
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd]?)$/);
  if (!match) return 3600; // fallback: 1 hour
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}

/**
 * Generate JWT tokens (access + refresh)
 */
export const generateTokens = (payload: { userId: string; email: string; role: string }) => {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: parseDurationToSeconds(env.JWT_EXPIRES_IN),
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: parseDurationToSeconds(env.JWT_EXPIRES_IN), // correct seconds value
  };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }
};
