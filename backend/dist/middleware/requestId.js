"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = void 0;
const uuid_1 = require("uuid");
/**
 * Request ID Middleware
 *
 * Attaches a unique ID to each request for tracing and logging
 * Can accept X-Request-ID header from client or generate new one
 */
const requestId = (req, res, next) => {
    // Use client-provided ID or generate new one
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    // Attach to request object
    req.requestId = requestId;
    // Set response header for client tracking
    res.setHeader('X-Request-ID', requestId);
    next();
};
exports.requestId = requestId;
//# sourceMappingURL=requestId.js.map