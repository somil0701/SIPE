import { Request, Response, NextFunction } from 'express';
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
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export declare const authorize: (...allowedRoles: string[]) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Premium feature middleware
 * Checks if user has premium access
 */
export declare const requirePremium: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Generate JWT tokens (access + refresh)
 */
export declare const generateTokens: (payload: {
    userId: string;
    email: string;
    role: string;
}) => {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
};
/**
 * Verify refresh token
 */
export declare const verifyRefreshToken: (token: string) => {
    userId: string;
};
//# sourceMappingURL=auth.d.ts.map