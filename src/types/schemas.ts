/**
 * Zod validation schemas for the FDA MCP Server
 */

import { z } from 'zod';

// ============================================================================
// Server Configuration Schemas
// ============================================================================

export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'debug']);

export const FdaServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  fdaApiBaseUrl: z.string().url(),
  requestTimeout: z.number().positive(),
  retryAttempts: z.number().min(0).max(5),
  logLevel: LogLevelSchema,
  enableRequestLogging: z.boolean(),
  maxConcurrentRequests: z.number().positive(),
  rateLimitPerMinute: z.number().positive()
});

// ============================================================================
// Environment Variables Schema
// ============================================================================

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: LogLevelSchema.default('info'),
  FDA_API_KEY: z.string().optional(),
  FDA_API_BASE_URL: z.string().url().default('https://api.fda.gov'),
  REQUEST_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('30000'),
  RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(5)).default('3'),
  MAX_CONCURRENT_REQUESTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('10'),
  RATE_LIMIT_PER_MINUTE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('60')
});

// ============================================================================
// Request/Response Schemas
// ============================================================================

export const RequestMetadataSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: z.date(),
  source: z.string().optional()
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  success: z.literal(false),
  requestId: z.string().optional()
});

export const SuccessResponseSchema = z.object({
  data: z.any(),
  success: z.literal(true),
  metadata: z.object({
    total: z.number().optional(),
    limit: z.number().optional(),
    skip: z.number().optional(),
    executionTime: z.number().optional(),
    requestId: z.string().optional()
  }).optional()
});

export const ApiResponseSchema = z.union([
  ErrorResponseSchema,
  SuccessResponseSchema
]);

// ============================================================================
// Tool Execution Schemas
// ============================================================================

export const ToolExecutionContextSchema = z.object({
  requestId: z.string().uuid(),
  startTime: z.date(),
  toolName: z.string(),
  parameters: z.record(z.any())
});

export const ToolResultSchema = z.object({
  content: z.array(z.object({
    type: z.literal('text'),
    text: z.string()
  }))
});

// ============================================================================
// Prompt Execution Schemas
// ============================================================================

export const PromptMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.object({
    type: z.literal('text'),
    text: z.string()
  })
});

export const PromptResultSchema = z.object({
  description: z.string(),
  messages: z.array(PromptMessageSchema)
});

// ============================================================================
// Validation Utilities
// ============================================================================

export function validateEnvironment(): z.infer<typeof EnvironmentSchema> {
  const result = EnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(err =>
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function sanitizeError(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'code' in error ? String(error.code) : undefined
    };
  }

  return {
    message: String(error),
    code: 'UNKNOWN_ERROR'
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isErrorResponse(response: unknown): response is z.infer<typeof ErrorResponseSchema> {
  return ErrorResponseSchema.safeParse(response).success;
}

export function isSuccessResponse(response: unknown): response is z.infer<typeof SuccessResponseSchema> {
  return SuccessResponseSchema.safeParse(response).success;
}

export function isValidLogLevel(level: string): level is z.infer<typeof LogLevelSchema> {
  return LogLevelSchema.safeParse(level).success;
}