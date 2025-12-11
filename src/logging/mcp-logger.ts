/**
 * MCP 2025-06-18 compliant logging service
 * Implements logging utilities as per the specification
 */

import { McpLogLevel } from '../types/index.js';

export interface McpLogMessage {
  level: McpLogLevel;
  logger?: string;
  data: unknown;
}

export interface McpLoggerConfig {
  minimumLevel: McpLogLevel;
  rateLimitPerSecond?: number;
  loggerName?: string;
}

/**
 * MCP-compliant logging service that sends log notifications
 * following the 2025-06-18 specification
 */
export class McpLogger {
  private minimumLevel: McpLogLevel = 'info';
  private loggerName?: string;
  private rateLimitPerSecond: number = 10;
  private lastSecond: number = 0;
  private messagesThisSecond: number = 0;
  private notificationCallback?: (message: McpLogMessage) => void;

  // Syslog severity level mapping (RFC 5424)
  private readonly levelPriority: Record<McpLogLevel, number> = {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
  };

  constructor(config?: McpLoggerConfig) {
    if (config) {
      this.minimumLevel = config.minimumLevel;
      this.loggerName = config.loggerName;
      this.rateLimitPerSecond = config.rateLimitPerSecond ?? 10;
    }
  }

  /**
   * Set the notification callback for sending log messages to MCP client
   */
  public setNotificationCallback(callback: (message: McpLogMessage) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * Set minimum log level as per MCP specification
   */
  public setLevel(level: McpLogLevel): void {
    this.minimumLevel = level;
  }

  /**
   * Get current minimum log level
   */
  public getLevel(): McpLogLevel {
    return this.minimumLevel;
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: McpLogLevel): boolean {
    return this.levelPriority[level] <= this.levelPriority[this.minimumLevel];
  }

  /**
   * Rate limiting for log messages
   */
  private isRateLimited(): boolean {
    const currentSecond = Math.floor(Date.now() / 1000);

    if (currentSecond !== this.lastSecond) {
      this.lastSecond = currentSecond;
      this.messagesThisSecond = 0;
    }

    if (this.messagesThisSecond >= this.rateLimitPerSecond) {
      return true;
    }

    this.messagesThisSecond++;
    return false;
  }

  /**
   * Send log message following MCP 2025-06-18 specification
   */
  private sendLogMessage(level: McpLogLevel, data: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    if (this.isRateLimited()) {
      return;
    }

    const message: McpLogMessage = {
      level,
      data: this.sanitizeData(data)
    };

    if (this.loggerName) {
      message.logger = this.loggerName;
    }

    if (this.notificationCallback) {
      try {
        this.notificationCallback(message);
      } catch (error) {
        // Avoid recursive logging errors
        console.error('Failed to send MCP log notification:', error);
      }
    }
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data as Record<string, unknown> };

      // Remove common sensitive fields
      const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'credential',
        'authorization', 'cookie', 'session', 'apikey',
        'private_key', 'access_token', 'refresh_token'
      ];

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      // Recursively sanitize nested objects
      for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeData(value);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Emergency: System is unusable
   */
  public emergency(message: string, data?: unknown): void {
    this.sendLogMessage('emergency', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Alert: Immediate action required
   */
  public alert(message: string, data?: unknown): void {
    this.sendLogMessage('alert', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Critical: Critical conditions
   */
  public critical(message: string, data?: unknown): void {
    this.sendLogMessage('critical', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Error: Error conditions
   */
  public error(message: string, data?: unknown): void {
    this.sendLogMessage('error', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Warning: Warning conditions
   */
  public warning(message: string, data?: unknown): void {
    this.sendLogMessage('warning', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Notice: Normal but significant events
   */
  public notice(message: string, data?: unknown): void {
    this.sendLogMessage('notice', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Info: General informational messages
   */
  public info(message: string, data?: unknown): void {
    this.sendLogMessage('info', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Debug: Detailed debugging information
   */
  public debug(message: string, data?: unknown): void {
    this.sendLogMessage('debug', {
      message,
      timestamp: new Date().toISOString(),
      ...data as object
    });
  }

  /**
   * Create child logger with specific context
   */
  public createChildLogger(loggerName: string): McpLogger {
    const child = new McpLogger({
      minimumLevel: this.minimumLevel,
      rateLimitPerSecond: this.rateLimitPerSecond,
      loggerName
    });

    child.setNotificationCallback(this.notificationCallback!);
    return child;
  }

  /**
   * Get logging statistics
   */
  public getStats(): {
    minimumLevel: McpLogLevel;
    rateLimitPerSecond: number;
    messagesThisSecond: number;
    loggerName?: string;
  } {
    return {
      minimumLevel: this.minimumLevel,
      rateLimitPerSecond: this.rateLimitPerSecond,
      messagesThisSecond: this.messagesThisSecond,
      loggerName: this.loggerName
    };
  }
}

// Global MCP logger instance
export const mcpLogger = new McpLogger({
  minimumLevel: 'info',
  loggerName: 'fda-mcp-server'
});