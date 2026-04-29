import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * 
 * Attaches a unique ID to each request for tracing and logging
 * Can accept X-Request-ID header from client or generate new one
 */

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use client-provided ID or generate new one
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Set response header for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  next();
};