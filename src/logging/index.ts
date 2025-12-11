/**
 * Centralized logging service for FDA MCP Server
 */

import { LogLevel } from '../types/index.js';
import { config } from '../config/index.js';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  requestId?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface LogContext {
  component?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enableRequestLogging: boolean;

  private constructor() {
    this.logLevel = config.getLogLevel();
    this.enableRequestLogging = config.isRequestLoggingEnabled();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    return levels[level] <= levels[this.logLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    if (config.isDevelopment()) {
      // Human-readable format for development
      const timestamp = new Date(entry.timestamp).toISOString();
      const component = entry.component ? `[${entry.component}]` : '';
      const requestId = entry.requestId ? `{${entry.requestId.slice(0, 8)}}` : '';

      let message = `${timestamp} ${entry.level.toUpperCase()} ${component}${requestId} ${entry.message}`;

      if (entry.data && Object.keys(entry.data).length > 0) {
        message += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
      }

      if (entry.error) {
        message += `\n  Error: ${entry.error.stack || entry.error.message}`;
      }

      return message;
    } else {
      // JSON format for production
      return JSON.stringify(entry);
    }
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatLogEntry(entry);

    // Always log to stderr to avoid interfering with JSON-RPC on stdout
    process.stderr.write(formatted + '\n');
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      ...context
    });
  }

  public warn(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
      ...context
    });
  }

  public info(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
      ...context
    });
  }

  public debug(message: string, data?: Record<string, unknown>, context?: LogContext): void {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      data,
      ...context
    });
  }

  public request(method: string, url: string, requestId: string, duration?: number): void {
    if (!this.enableRequestLogging) {
      return;
    }

    this.info(`${method} ${url}`, {
      duration: duration ? `${duration}ms` : undefined
    }, {
      component: 'HTTP',
      requestId
    });
  }

  public response(status: number, requestId: string, duration: number, size?: number): void {
    if (!this.enableRequestLogging) {
      return;
    }

    this.info(`Response ${status}`, {
      duration: `${duration}ms`,
      size: size ? `${size} bytes` : undefined
    }, {
      component: 'HTTP',
      requestId
    });
  }

  public apiCall(endpoint: string, params: Record<string, unknown>, requestId: string): void {
    this.debug('FDA API call', {
      endpoint,
      params
    }, {
      component: 'FDA_API',
      requestId
    });
  }

  public apiResponse(endpoint: string, status: number, duration: number, requestId: string): void {
    this.debug('FDA API response', {
      endpoint,
      status,
      duration: `${duration}ms`
    }, {
      component: 'FDA_API',
      requestId
    });
  }

  public toolExecution(toolName: string, params: Record<string, unknown>, requestId: string): void {
    this.info(`Tool execution: ${toolName}`, {
      params
    }, {
      component: 'TOOL',
      requestId,
      operation: toolName
    });
  }

  public promptExecution(promptName: string, params: Record<string, unknown>, requestId: string): void {
    this.info(`Prompt execution: ${promptName}`, {
      params
    }, {
      component: 'PROMPT',
      requestId,
      operation: promptName
    });
  }

  public cacheHit(key: string, requestId?: string): void {
    this.debug('Cache hit', { key }, {
      component: 'CACHE',
      requestId
    });
  }

  public cacheMiss(key: string, requestId?: string): void {
    this.debug('Cache miss', { key }, {
      component: 'CACHE',
      requestId
    });
  }

  public rateLimitHit(identifier: string, limit: number, requestId?: string): void {
    this.warn('Rate limit exceeded', {
      identifier,
      limit
    }, {
      component: 'RATE_LIMIT',
      requestId
    });
  }

  public serverStart(config: Record<string, unknown>): void {
    this.info('FDA MCP Server starting', {
      version: config.version,
      nodeEnv: process.env.NODE_ENV,
      logLevel: this.logLevel
    }, {
      component: 'SERVER'
    });
  }

  public serverReady(port?: number): void {
    this.info('FDA MCP Server ready', {
      port
    }, {
      component: 'SERVER'
    });
  }

  public serverShutdown(): void {
    this.info('FDA MCP Server shutting down', {}, {
      component: 'SERVER'
    });
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level changed to ${level}`, {}, {
      component: 'LOGGER'
    });
  }

  public createChildLogger(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}

export class ChildLogger {
  constructor(
    private parent: Logger,
    private context: LogContext
  ) {}

  public error(message: string, error?: Error, additionalContext?: Partial<LogContext>): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }

  public warn(message: string, data?: Record<string, unknown>, additionalContext?: Partial<LogContext>): void {
    this.parent.warn(message, data, { ...this.context, ...additionalContext });
  }

  public info(message: string, data?: Record<string, unknown>, additionalContext?: Partial<LogContext>): void {
    this.parent.info(message, data, { ...this.context, ...additionalContext });
  }

  public debug(message: string, data?: Record<string, unknown>, additionalContext?: Partial<LogContext>): void {
    this.parent.debug(message, data, { ...this.context, ...additionalContext });
  }
}

export const logger = Logger.getInstance();