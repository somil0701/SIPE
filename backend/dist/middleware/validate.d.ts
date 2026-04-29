import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Validation middleware factory
 * Validates request body, query, or params against Zod schema
 */
interface ValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}
export declare const validate: (schemas: ValidationSchemas) => (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Common validation schemas
 */
import { z } from 'zod';
export declare const commonSchemas: {
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
        limit: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: string | undefined;
        limit?: string | undefined;
    }>;
    uuidParam: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    email: z.ZodString;
    password: z.ZodString;
    difficulty: z.ZodEnum<["easy", "medium", "hard", "expert"]>;
    language: z.ZodEnum<["javascript", "typescript", "python", "java", "cpp", "csharp", "go", "rust", "ruby"]>;
};
export {};
//# sourceMappingURL=validate.d.ts.map