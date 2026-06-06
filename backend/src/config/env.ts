import { z } from 'zod';

/**
 * Environment variable validation using Zod
 * This ensures all required env vars are present and correctly typed
 */

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // Groq
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  UPLOAD_DIR: z.string().default('uploads'),

  // Docker Judge
  DOCKER_BINARY: z.string().default('docker'),
  JUDGE_TEMP_DIR: z.string().default('tmp/judge'),
  JUDGE_RUN_TIMEOUT_MS: z.string().transform(Number).default('3000'),
  JUDGE_COMPILE_TIMEOUT_MS: z.string().transform(Number).default('10000'),
  JUDGE_MEMORY_LIMIT: z.string().default('512m'),
  JUDGE_CPU_LIMIT: z.string().default('0.5'),
  JUDGE_PIDS_LIMIT: z.string().transform(Number).default('64'),
  JUDGE_IMAGE_JAVASCRIPT: z.string().default('node:20-alpine'),
  JUDGE_IMAGE_PYTHON: z.string().default('python:3.12-alpine'),
  JUDGE_IMAGE_CPP: z.string().default('gcc:13-bookworm'),
  JUDGE_IMAGE_JAVA: z.string().default('eclipse-temurin:21-jdk-alpine'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // AWS S3 (optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
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

export const env = parsedEnv.data;
