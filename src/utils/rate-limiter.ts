/**
 * Rate limiting service for FDA MCP Server
 */

import { logger } from '../logging/index.js';
import { config } from '../config/index.js';
import { errorHandler } from '../errors/index.js';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
  resetTime: number;
  isExceeded: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private store: Map<string, RateLimitEntry>;
  private windowMs: number;
  private maxRequests: number;
  private keyGenerator: (identifier: string) => string;
  private cleanupInterval: NodeJS.Timeout;

  private constructor(options: RateLimitOptions) {
    this.store = new Map();
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.keyGenerator = options.keyGenerator || ((id: string) => id);

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  public static getInstance(options?: RateLimitOptions): RateLimiter {
    if (!RateLimiter.instance) {
      const defaultOptions: RateLimitOptions = {
        windowMs: 60000, // 1 minute
        maxRequests: config.getRateLimitPerMinute()
      };
      RateLimiter.instance = new RateLimiter(options || defaultOptions);
    }
    return RateLimiter.instance;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limiter cleanup: removed ${cleaned} expired entries`, {
        cleaned,
        remaining: this.store.size
      }, {
        component: 'RATE_LIMITER'
      });
    }
  }

  private getKey(identifier: string): string {
    return this.keyGenerator(identifier);
  }

  private getCurrentWindow(): { start: number; end: number } {
    const now = Date.now();
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    const end = start + this.windowMs;
    return { start, end };
  }

  public check(identifier: string, requestId?: string): RateLimitInfo {
    const key = this.getKey(identifier);
    const now = Date.now();
    const window = this.getCurrentWindow();

    let entry = this.store.get(key);

    // Create new entry if doesn't exist or window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: window.end,
        firstRequestTime: now
      };
      this.store.set(key, entry);
    }

    const remaining = Math.max(0, this.maxRequests - entry.count);
    const isExceeded = entry.count >= this.maxRequests;

    const info: RateLimitInfo = {
      limit: this.maxRequests,
      used: entry.count,
      remaining,
      resetTime: entry.resetTime,
      isExceeded
    };

    if (isExceeded) {
      logger.rateLimitHit(identifier, this.maxRequests, requestId);
    }

    return info;
  }

  public consume(identifier: string, requestId?: string): RateLimitInfo {
    const info = this.check(identifier, requestId);

    if (!info.isExceeded) {
      const key = this.getKey(identifier);
      const entry = this.store.get(key);
      if (entry) {
        entry.count++;
      }

      // Update the info to reflect the consumption
      info.used++;
      info.remaining = Math.max(0, info.remaining - 1);
      info.isExceeded = info.used >= this.maxRequests;
    }

    return info;
  }

  public reset(identifier: string, requestId?: string): void {
    const key = this.getKey(identifier);
    this.store.delete(key);

    logger.debug('Rate limit reset', { identifier }, {
      component: 'RATE_LIMITER',
      requestId
    });
  }

  public resetAll(requestId?: string): void {
    const size = this.store.size;
    this.store.clear();

    logger.info('All rate limits reset', { previousSize: size }, {
      component: 'RATE_LIMITER',
      requestId
    });
  }

  public getStats(): {
    activeEntries: number;
    totalWindowMs: number;
    maxRequestsPerWindow: number;
  } {
    return {
      activeEntries: this.store.size,
      totalWindowMs: this.windowMs,
      maxRequestsPerWindow: this.maxRequests
    };
  }

  public getEntry(identifier: string): RateLimitEntry | undefined {
    const key = this.getKey(identifier);
    return this.store.get(key);
  }

  public getAllEntries(): Array<[string, RateLimitEntry]> {
    return Array.from(this.store.entries());
  }

  public setOptions(options: Partial<RateLimitOptions>): void {
    if (options.windowMs !== undefined) {
      this.windowMs = options.windowMs;
    }
    if (options.maxRequests !== undefined) {
      this.maxRequests = options.maxRequests;
    }
    if (options.keyGenerator !== undefined) {
      this.keyGenerator = options.keyGenerator;
    }

    logger.debug('Rate limiter options updated', options, {
      component: 'RATE_LIMITER'
    });
  }

  public middleware() {
    return (identifier: string, requestId?: string) => {
      const info = this.consume(identifier, requestId);

      if (info.isExceeded) {
        throw errorHandler.handleRateLimitError(
          this.maxRequests,
          this.windowMs,
          requestId
        );
      }

      return info;
    };
  }

  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limiter instances
export const apiRateLimiter = RateLimiter.getInstance({
  windowMs: 60000,
  maxRequests: config.getRateLimitPerMinute(),
  keyGenerator: (identifier: string) => `api:${identifier}`
});

export const toolRateLimiter = RateLimiter.getInstance({
  windowMs: 60000,
  maxRequests: 100,
  keyGenerator: (identifier: string) => `tool:${identifier}`
});

export const promptRateLimiter = RateLimiter.getInstance({
  windowMs: 60000,
  maxRequests: 50,
  keyGenerator: (identifier: string) => `prompt:${identifier}`
});