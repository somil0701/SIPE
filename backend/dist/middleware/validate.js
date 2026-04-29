"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonSchemas = exports.validate = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("./errorHandler");
const validate = (schemas) => {
    return async (req, _res, next) => {
        try {
            const errors = {};
            // Validate body
            if (schemas.body) {
                try {
                    req.body = await schemas.body.parseAsync(req.body);
                }
                catch (error) {
                    if (error instanceof zod_1.ZodError) {
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
                }
                catch (error) {
                    if (error instanceof zod_1.ZodError) {
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
                }
                catch (error) {
                    if (error instanceof zod_1.ZodError) {
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
                throw errorHandler_1.ApiError.validation('Validation failed', errors);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
/**
 * Common validation schemas
 */
const zod_2 = require("zod");
exports.commonSchemas = {
    // Pagination
    pagination: zod_2.z.object({
        page: zod_2.z.string().transform(Number).default('1'),
        limit: zod_2.z.string().transform(Number).default('20'),
    }),
    // UUID param
    uuidParam: zod_2.z.object({
        id: zod_2.z.string().uuid('Invalid ID format'),
    }),
    // Email
    email: zod_2.z.string().email('Invalid email format'),
    // Password (strong)
    password: zod_2.z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    // Difficulty
    difficulty: zod_2.z.enum(['easy', 'medium', 'hard', 'expert']),
    // Programming language
    language: zod_2.z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'ruby']),
};
//# sourceMappingURL=validate.js.map