/**
 * Configuration type definitions for FDA MCP Server
 */

import { z } from 'zod';
import { LogLevel } from '../types/index.js';

export interface ServerConfiguration {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
}

export interface ApiConfiguration {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  userAgent: string;
}

export interface LoggingConfiguration {
  level: LogLevel;
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enableErrorLogging: boolean;
  logFormat: 'json' | 'text';
  logDestination: 'console' | 'file';
  logFilePath?: string;
  maxLogFileSize: number;
  maxLogFiles: number;
}

export interface PerformanceConfiguration {
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
  requestQueueSize: number;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  maxCacheSize: number;
  requestDeduplicationEnabled: boolean;
}

export interface SecurityConfiguration {
  enableCors: boolean;
  corsOrigins: string[];
  enableRateLimit: boolean;
  trustProxy: boolean;
  maxRequestSize: string;
}

export interface FeatureConfiguration {
  enableMetrics: boolean;
  enableHealthCheck: boolean;
  enablePrompts: boolean;
  enableTools: boolean;
  enableAdvancedSearch: boolean;
  enableCaching: boolean;
}

export interface ValidationConfiguration {
  strictParameterValidation: boolean;
  enableSchemaValidation: boolean;
  maxSearchTermLength: number;
  allowedSearchTypes: string[];
  requiredParameters: string[];
}

export interface FullConfiguration {
  server: ServerConfiguration;
  api: ApiConfiguration;
  logging: LoggingConfiguration;
  performance: PerformanceConfiguration;
  security: SecurityConfiguration;
  features: FeatureConfiguration;
  validation: ValidationConfiguration;
}

export const ServerConfigSchema = z.object({
  name: z.string().min(1, 'Server name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
  description: z.string().min(1, 'Server description is required'),
  author: z.string().min(1, 'Author is required'),
  license: z.string().min(1, 'License is required')
});

export const ApiConfigSchema = z.object({
  baseUrl: z.string().url('Invalid API base URL'),
  apiKey: z.string().optional(),
  timeout: z.number().positive('Timeout must be positive'),
  retryAttempts: z.number().min(0).max(10, 'Retry attempts must be between 0 and 10'),
  retryDelay: z.number().positive('Retry delay must be positive'),
  userAgent: z.string().min(1, 'User agent is required')
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  enableRequestLogging: z.boolean(),
  enableResponseLogging: z.boolean(),
  enableErrorLogging: z.boolean(),
  logFormat: z.enum(['json', 'text']),
  logDestination: z.enum(['console', 'file']),
  logFilePath: z.string().optional(),
  maxLogFileSize: z.number().positive(),
  maxLogFiles: z.number().positive()
});

export const PerformanceConfigSchema = z.object({
  maxConcurrentRequests: z.number().positive('Max concurrent requests must be positive'),
  rateLimitPerMinute: z.number().positive('Rate limit must be positive'),
  requestQueueSize: z.number().positive('Request queue size must be positive'),
  cacheEnabled: z.boolean(),
  cacheTtlSeconds: z.number().positive('Cache TTL must be positive'),
  maxCacheSize: z.number().positive('Max cache size must be positive')
});

export const SecurityConfigSchema = z.object({
  enableCors: z.boolean(),
  corsOrigins: z.array(z.string()),
  enableRateLimit: z.boolean(),
  trustProxy: z.boolean(),
  maxRequestSize: z.string().regex(/^\d+[kmg]b$/i, 'Invalid request size format')
});

export const FeatureConfigSchema = z.object({
  enableMetrics: z.boolean(),
  enableHealthCheck: z.boolean(),
  enablePrompts: z.boolean(),
  enableTools: z.boolean(),
  enableAdvancedSearch: z.boolean(),
  enableCaching: z.boolean()
});

export const ValidationConfigSchema = z.object({
  strictParameterValidation: z.boolean(),
  enableSchemaValidation: z.boolean(),
  maxSearchTermLength: z.number().positive('Max search term length must be positive'),
  allowedSearchTypes: z.array(z.string()),
  requiredParameters: z.array(z.string())
});

export const FullConfigSchema = z.object({
  server: ServerConfigSchema,
  api: ApiConfigSchema,
  logging: LoggingConfigSchema,
  performance: PerformanceConfigSchema,
  security: SecurityConfigSchema,
  features: FeatureConfigSchema,
  validation: ValidationConfigSchema
});

export type ConfigurationSection = keyof FullConfiguration;

export interface ConfigurationDefaults {
  server: ServerConfiguration;
  api: Partial<ApiConfiguration>;
  logging: LoggingConfiguration;
  performance: PerformanceConfiguration;
  security: SecurityConfiguration;
  features: FeatureConfiguration;
  validation: ValidationConfiguration;
}