import { Request, Response, NextFunction } from 'express';
/**
 * Custom API Error class
 */
export declare class ApiError extends Error {
    statusCode: number;
    code: string;
    details?: Record<string, string[]>;
    constructor(statusCode: number, message: string, code?: string, details?: Record<string, string[]>);
    static badRequest(message: string, code?: string, details?: Record<string, string[]>): ApiError;
    static unauthorized(message?: string, code?: string): ApiError;
    static forbidden(message?: string, code?: string): ApiError;
    static notFound(message?: string, code?: string): ApiError;
    static conflict(message: string, code?: string): ApiError;
    static validation(message: string, details: Record<string, string[]>): ApiError;
    static tooManyRequests(message?: string, code?: string): ApiError;
    static internal(message?: string): ApiError;
}
/**
 * Global error handler middleware
 */
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => void;
/**
 * Async handler wrapper to catch errors in async route handlers
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map