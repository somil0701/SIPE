"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
/**
 * Environment variable validation using Zod
 * This ensures all required env vars are present and correctly typed
 */
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    API_VERSION: zod_1.z.string().default('v1'),
    // Database
    DATABASE_URL: zod_1.z.string(),
    // Redis
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    // CORS
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    // Rate Limiting
    RATE_LIMIT_MAX: zod_1.z.string().transform(Number).default('100'),
    // OpenAI
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().default('gpt-4-turbo-preview'),
    // File Upload
    MAX_FILE_SIZE: zod_1.z.string().transform(Number).default('5242880'), // 5MB
    UPLOAD_DIR: zod_1.z.string().default('uploads'),
    // Email (optional)
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().transform(Number).optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    // AWS S3 (optional)
    AWS_ACCESS_KEY_ID: zod_1.z.string().optional(),
    AWS_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    AWS_S3_BUCKET: zod_1.z.string().optional(),
    AWS_REGION: zod_1.z.string().default('us-east-1'),
});
// Parse and validate env vars
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:');
    parsedEnv.error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
}
exports.env = parsedEnv.data;
//# sourceMappingURL=env.js.map