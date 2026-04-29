"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateTokens = exports.requirePremium = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const database_1 = require("../config/database");
const errorHandler_1 = require("./errorHandler");
/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
const authenticate = async (req, _res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw errorHandler_1.ApiError.unauthorized('Access token required');
        }
        const token = authHeader.substring(7);
        // Verify token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw errorHandler_1.ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw errorHandler_1.ApiError.unauthorized('Invalid token', 'INVALID_TOKEN');
            }
            throw errorHandler_1.ApiError.unauthorized('Token verification failed');
        }
        // Check if user still exists
        const user = await database_1.prisma.user.findUnique({
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
            throw errorHandler_1.ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            isPremium: user.isPremium,
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            const user = await database_1.prisma.user.findUnique({
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
        }
        catch {
            // Ignore token errors for optional auth
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 */
const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(errorHandler_1.ApiError.unauthorized('Authentication required'));
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            next(errorHandler_1.ApiError.forbidden('Insufficient permissions'));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Premium feature middleware
 * Checks if user has premium access
 */
const requirePremium = (req, _res, next) => {
    if (!req.user) {
        next(errorHandler_1.ApiError.unauthorized('Authentication required'));
        return;
    }
    if (!req.user.isPremium && req.user.role !== 'admin') {
        next(errorHandler_1.ApiError.forbidden('Premium subscription required', 'PREMIUM_REQUIRED'));
        return;
    }
    next();
};
exports.requirePremium = requirePremium;
/**
 * Parse a JWT duration string like "7d", "24h", "60m", "3600s" or a plain number
 * and return the equivalent number of seconds.
 */
function parseDurationToSeconds(duration) {
    const match = duration.match(/^(\d+)([smhd]?)$/);
    if (!match)
        return 3600; // fallback: 1 hour
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
}
/**
 * Generate JWT tokens (access + refresh)
 */
const generateTokens = (payload) => {
    const accessToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        expiresIn: parseDurationToSeconds(env_1.env.JWT_EXPIRES_IN),
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: parseDurationToSeconds(env_1.env.JWT_REFRESH_EXPIRES_IN) });
    return {
        accessToken,
        refreshToken,
        expiresIn: parseDurationToSeconds(env_1.env.JWT_EXPIRES_IN), // correct seconds value
    };
};
exports.generateTokens = generateTokens;
/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw errorHandler_1.ApiError.unauthorized('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
        }
        throw errorHandler_1.ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=auth.js.map