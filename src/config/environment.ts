/**
 * Environment variable validation and configuration
 */

import { z } from 'zod';
import { LogLevel } from '../types/index.js';

export const EnvironmentConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  FDA_API_KEY: z.string().optional(),
  FDA_API_BASE_URL: z.string().url().default('https://api.fda.gov'),
  REQUEST_TIMEOUT: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('30000'),
  RETRY_ATTEMPTS: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(0).max(5))
    .default('3'),
  MAX_CONCURRENT_REQUESTS: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('10'),
  RATE_LIMIT_PER_MINUTE: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('60'),
  DEBUG: z.string().optional()
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export interface ProcessedEnvironment {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: LogLevel;
  fdaApiKey?: string;
  fdaApiBaseUrl: string;
  requestTimeout: number;
  retryAttempts: number;
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
  isDebugEnabled: boolean;
}

export function validateAndProcessEnvironment(): ProcessedEnvironment {
  const result = EnvironmentConfigSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(err =>
      `${err.path.join('.')}: ${err.message}`
    ).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  const env = result.data;

  return {
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    fdaApiKey: env.FDA_API_KEY,
    fdaApiBaseUrl: env.FDA_API_BASE_URL,
    requestTimeout: env.REQUEST_TIMEOUT,
    retryAttempts: env.RETRY_ATTEMPTS,
    maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    isDebugEnabled: env.DEBUG === 'true' || env.NODE_ENV === 'development'
  };
}

export function validateEnvironmentVariables(): void {
  try {
    validateAndProcessEnvironment();
  } catch (error) {
    // Use stderr for critical startup errors
    process.stderr.write(`Environment validation failed: ${error}\n`);
    process.exit(1);
  }
}

export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

export function getNumericEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return parsed;
}

export function getBooleanEnvVar(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}