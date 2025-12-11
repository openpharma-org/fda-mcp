/**
 * Core types for the FDA MCP Server
 */

import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// MCP 2025-06-18 syslog severity levels (RFC 5424)
export type McpLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface FdaServerConfig {
  // Server settings
  name: string;
  version: string;

  // API settings
  fdaApiBaseUrl: string;
  requestTimeout: number;
  retryAttempts: number;

  // Logging
  logLevel: LogLevel;
  enableRequestLogging: boolean;

  // Performance
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: ErrorResponse;
  metadata?: {
    executionTime: number;
    requestId: string;
    [key: string]: unknown; // Allow additional metadata properties
  };
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface PromptDefinition {
  name: string;
  description: string;
  argsSchema: Record<string, z.ZodSchema>;
}

export interface PromptExecutionResult {
  description: string;
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

export enum FdaErrorType {
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface FdaError extends Error {
  type: FdaErrorType;
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  success: false;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    total?: number;
    limit?: number;
    skip?: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type AsyncFunction<T extends readonly unknown[], R> = (...args: T) => Promise<R>;

export type Constructor<T = Record<string, unknown>> = new (...args: unknown[]) => T;

export interface Disposable {
  dispose(): void | Promise<void>;
}

// ============================================================================
// MCP Compatibility Types
// ============================================================================

export interface LegacyPromptSchema {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface ModernPromptConfig {
  description: string;
  argsSchema: Record<string, z.ZodSchema>;
}

// ============================================================================
// Request/Response Validation
// ============================================================================

export const RequestIdSchema = z.string().uuid();

export const LogLevelSchema = z.enum(['error', 'warn', 'info', 'debug']);

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  metadata: z.object({
    total: z.number().optional(),
    limit: z.number().optional(),
    skip: z.number().optional()
  }).optional()
});