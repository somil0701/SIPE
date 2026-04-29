import { Request, Response, NextFunction } from 'express';
/**
 * Request ID Middleware
 *
 * Attaches a unique ID to each request for tracing and logging
 * Can accept X-Request-ID header from client or generate new one
 */
export declare const requestId: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestId.d.ts.map