/**
 * Configuration management for FDA MCP Server
 */

import { z } from 'zod';
import { FdaServerConfig, LogLevel } from '../types/index.js';
import { validateEnvironment } from '../types/schemas.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: FdaServerConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfiguration(): FdaServerConfig {
    // Validate environment variables
    const env = validateEnvironment();

    // Create configuration from environment and defaults
    return {
      name: 'fda-mcp-server',
      version: process.env.npm_package_version || '1.0.0',
      fdaApiBaseUrl: env.FDA_API_BASE_URL,
      requestTimeout: env.REQUEST_TIMEOUT,
      retryAttempts: env.RETRY_ATTEMPTS,
      logLevel: env.LOG_LEVEL,
      enableRequestLogging: env.NODE_ENV === 'development',
      maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
      rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE
    };
  }

  public getConfig(): FdaServerConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<FdaServerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getApiBaseUrl(): string {
    return this.config.fdaApiBaseUrl;
  }

  public getRequestTimeout(): number {
    return this.config.requestTimeout;
  }

  public getRetryAttempts(): number {
    return this.config.retryAttempts;
  }

  public getLogLevel(): LogLevel {
    return this.config.logLevel;
  }

  public isRequestLoggingEnabled(): boolean {
    return this.config.enableRequestLogging;
  }

  public getMaxConcurrentRequests(): number {
    return this.config.maxConcurrentRequests;
  }

  public getRateLimitPerMinute(): number {
    return this.config.rateLimitPerMinute;
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  public validateConfig(): void {
    const configSchema = z.object({
      name: z.string().min(1),
      version: z.string().min(1),
      fdaApiBaseUrl: z.string().url(),
      requestTimeout: z.number().positive(),
      retryAttempts: z.number().min(0).max(5),
      logLevel: z.enum(['error', 'warn', 'info', 'debug']),
      enableRequestLogging: z.boolean(),
      maxConcurrentRequests: z.number().positive(),
      rateLimitPerMinute: z.number().positive()
    });

    const result = configSchema.safeParse(this.config);
    if (!result.success) {
      const errors = result.error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Configuration validation failed:\n${errors}`);
    }
  }

  public reset(): void {
    this.config = this.loadConfiguration();
  }

  public toJSON(): FdaServerConfig {
    return this.getConfig();
  }
}

export const config = ConfigManager.getInstance();