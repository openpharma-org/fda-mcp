/**
 * In-memory cache service for FDA MCP Server
 */

import { logger } from '../logging/index.js';
import { DEFAULT_CACHE_KEYS } from '../config/defaults.js';

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  utilizationPercent?: number;
  memoryPressure?: 'low' | 'medium' | 'high';
}

export interface CacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  cleanupInterval?: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry>;
  private accessOrder: Map<string, number>; // Track access order for LRU
  private accessCounter: number;
  private maxSize: number;
  private defaultTtl: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  private constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.accessCounter = 0;
    this.maxSize = options.maxSize || 1000;
    this.defaultTtl = options.defaultTtl || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    this.startCleanupTimer();
  }

  public static getInstance(options?: CacheOptions): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(options);
    }
    return CacheService.instance;
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const initialSize = this.cache.size;
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug(`Cache cleanup: removed ${expired} expired entries`, {
        expired,
        remaining: this.cache.size,
        initialSize
      }, {
        component: 'CACHE'
      });
    }
  }

  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) {
      return;
    }

    // Find the entry with the oldest access order
    let oldestKey: string | null = null;
    let oldestAccessOrder = Infinity;

    for (const [key, accessOrder] of this.accessOrder.entries()) {
      if (accessOrder < oldestAccessOrder) {
        oldestKey = key;
        oldestAccessOrder = accessOrder;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;

      logger.debug('Cache eviction: removed LRU entry', {
        key: oldestKey,
        hits: entry?.hits || 0,
        age: entry ? Date.now() - entry.timestamp : 0,
        accessOrder: oldestAccessOrder
      }, {
        component: 'CACHE'
      });
    }
  }

  public set<T>(key: string, value: T, ttl?: number, requestId?: string): void {
    // Check for memory pressure - evict early if approaching limit
    const memoryPressureThreshold = Math.floor(this.maxSize * 0.9);
    if (this.cache.size >= memoryPressureThreshold) {
      logger.debug('Cache approaching size limit, starting proactive eviction', {
        currentSize: this.cache.size,
        maxSize: this.maxSize,
        threshold: memoryPressureThreshold
      }, {
        component: 'CACHE'
      });
    }

    // Ensure we don't exceed max size
    while (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
      hits: 0
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);

    logger.debug('Cache set', {
      key,
      ttl: entry.ttl,
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100)
    }, {
      component: 'CACHE',
      requestId
    });
  }

  public get<T>(key: string, requestId?: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.cacheMiss(key, requestId);
      return undefined;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      logger.cacheMiss(key, requestId);
      return undefined;
    }

    // Update hit count, timestamp, and access order
    entry.hits++;
    entry.timestamp = now;
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;

    logger.cacheHit(key, requestId);
    return entry.value;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string, requestId?: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);

    if (deleted) {
      logger.debug('Cache delete', { key }, {
        component: 'CACHE',
        requestId
      });
    }

    return deleted;
  }

  public clear(requestId?: string): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };

    logger.info('Cache cleared', { previousSize: size }, {
      component: 'CACHE',
      requestId
    });
  }

  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const utilization = this.getCacheUtilization();

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      evictions: this.stats.evictions,
      utilizationPercent: utilization.utilizationPercent,
      memoryPressure: utilization.memoryPressure
    };
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getEntries(): Array<[string, CacheEntry]> {
    return Array.from(this.cache.entries());
  }

  public setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;

    // Evict entries if current size exceeds new max
    while (this.cache.size > this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  public setDefaultTtl(ttl: number): void {
    this.defaultTtl = ttl;
  }

  public getCacheUtilization(): {
    currentSize: number;
    maxSize: number;
    utilizationPercent: number;
    memoryPressure: 'low' | 'medium' | 'high';
  } {
    const currentSize = this.cache.size;
    const utilizationPercent = (currentSize / this.maxSize) * 100;

    let memoryPressure: 'low' | 'medium' | 'high' = 'low';
    if (utilizationPercent >= 90) {
      memoryPressure = 'high';
    } else if (utilizationPercent >= 70) {
      memoryPressure = 'medium';
    }

    return {
      currentSize,
      maxSize: this.maxSize,
      utilizationPercent: Math.round(utilizationPercent),
      memoryPressure
    };
  }

  // Convenience methods for different cache types
  public setDrugSearch(searchTerm: string, searchType: string, data: any, requestId?: string): void {
    const key = `${DEFAULT_CACHE_KEYS.drug_search}${searchType}:${searchTerm}`;
    this.set(key, data, undefined, requestId);
  }

  public getDrugSearch(searchTerm: string, searchType: string, requestId?: string): any {
    const key = `${DEFAULT_CACHE_KEYS.drug_search}${searchType}:${searchTerm}`;
    return this.get(key, requestId);
  }

  public setDeviceSearch(searchTerm: string, searchType: string, data: any, requestId?: string): void {
    const key = `${DEFAULT_CACHE_KEYS.device_search}${searchType}:${searchTerm}`;
    this.set(key, data, undefined, requestId);
  }

  public getDeviceSearch(searchTerm: string, searchType: string, requestId?: string): any {
    const key = `${DEFAULT_CACHE_KEYS.device_search}${searchType}:${searchTerm}`;
    return this.get(key, requestId);
  }

  public setPromptResult(promptName: string, params: any, result: any, requestId?: string): void {
    const paramsHash = this.hashParams(params);
    const key = `${DEFAULT_CACHE_KEYS.prompt_result}${promptName}:${paramsHash}`;
    this.set(key, result, undefined, requestId);
  }

  public getPromptResult(promptName: string, params: any, requestId?: string): any {
    const paramsHash = this.hashParams(params);
    const key = `${DEFAULT_CACHE_KEYS.prompt_result}${promptName}:${paramsHash}`;
    return this.get(key, requestId);
  }

  public setToolResult(toolName: string, params: any, result: any, requestId?: string): void {
    const paramsHash = this.hashParams(params);
    const key = `${DEFAULT_CACHE_KEYS.tool_result}${toolName}:${paramsHash}`;
    this.set(key, result, undefined, requestId);
  }

  public getToolResult(toolName: string, params: any, requestId?: string): any {
    const paramsHash = this.hashParams(params);
    const key = `${DEFAULT_CACHE_KEYS.tool_result}${toolName}:${paramsHash}`;
    return this.get(key, requestId);
  }

  private hashParams(params: any): string {
    // Simple hash function for cache keys
    const str = JSON.stringify(params, Object.keys(params).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  public dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

export const cacheService = CacheService.getInstance();