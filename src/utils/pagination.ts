/**
 * MCP 2025-06-18 cursor-based pagination utility
 * Implements pagination as per the specification
 */

export interface PaginationCursor {
  /** Opaque cursor token representing position in result set */
  cursor: string;
  /** When the cursor was created (for expiration) */
  timestamp: number;
  /** Additional metadata for cursor validation */
  metadata: Record<string, unknown>;
}

export interface PaginatedRequest {
  /** Optional cursor from previous response */
  cursor?: string;
}

export interface PaginatedResponse<T> {
  /** Current page of results */
  results: T[];
  /** Next cursor if more results exist */
  nextCursor?: string;
}

export interface PaginationConfig {
  /** Default page size */
  defaultPageSize: number;
  /** Maximum page size allowed */
  maxPageSize: number;
  /** Cursor expiration time in milliseconds */
  cursorExpirationMs: number;
}

/**
 * Cursor-based pagination implementation for MCP 2025-06-18
 */
export class PaginationService {
  private readonly config: PaginationConfig;
  private readonly cursorCache = new Map<string, PaginationCursor>();

  constructor(config?: Partial<PaginationConfig>) {
    this.config = {
      defaultPageSize: 10,
      maxPageSize: 100,
      cursorExpirationMs: 300_000, // 5 minutes
      ...config
    };

    // Clean up expired cursors periodically
    setInterval(() => {
      this.cleanExpiredCursors();
    }, this.config.cursorExpirationMs);
  }

  /**
   * Create a cursor for the next page
   */
  public createCursor(position: number, totalCount: number, metadata: Record<string, unknown> = {}): string | undefined {
    // Don't create cursor if we're at the end
    if (position >= totalCount) {
      return undefined;
    }

    const cursorId = this.generateCursorId();
    const cursor: PaginationCursor = {
      cursor: cursorId,
      timestamp: Date.now(),
      metadata: {
        position,
        totalCount,
        ...metadata
      }
    };

    this.cursorCache.set(cursorId, cursor);
    return cursorId;
  }

  /**
   * Parse and validate a cursor
   */
  public parseCursor(cursorToken?: string): { position: number; metadata: Record<string, unknown> } {
    if (!cursorToken) {
      return { position: 0, metadata: {} };
    }

    const cursor = this.cursorCache.get(cursorToken);
    if (!cursor) {
      throw new Error('Invalid cursor: cursor not found or expired');
    }

    // Check if cursor is expired
    if (Date.now() - cursor.timestamp > this.config.cursorExpirationMs) {
      this.cursorCache.delete(cursorToken);
      throw new Error('Invalid cursor: cursor has expired');
    }

    const position = cursor.metadata.position as number;
    if (typeof position !== 'number') {
      throw new Error('Invalid cursor: malformed cursor data');
    }

    return {
      position,
      metadata: cursor.metadata
    };
  }

  /**
   * Paginate an array of items
   */
  public paginateArray<T>(
    items: T[],
    request: PaginatedRequest,
    pageSize?: number
  ): PaginatedResponse<T> {
    const actualPageSize = Math.min(
      pageSize || this.config.defaultPageSize,
      this.config.maxPageSize
    );

    const { position } = this.parseCursor(request.cursor);

    // Calculate slice bounds
    const start = position;
    const end = start + actualPageSize;

    // Get the current page
    const results = items.slice(start, end);

    // Create next cursor if there are more results
    const nextCursor = this.createCursor(end, items.length, {
      pageSize: actualPageSize,
      requestedAt: new Date().toISOString()
    });

    return {
      results,
      nextCursor
    };
  }

  /**
   * Paginate with async data source
   */
  public async paginateAsync<T>(
    dataSource: (offset: number, limit: number) => Promise<{ items: T[]; totalCount: number }>,
    request: PaginatedRequest,
    pageSize?: number
  ): Promise<PaginatedResponse<T>> {
    const actualPageSize = Math.min(
      pageSize || this.config.defaultPageSize,
      this.config.maxPageSize
    );

    const { position } = this.parseCursor(request.cursor);

    // Fetch data from the async source
    const { items, totalCount } = await dataSource(position, actualPageSize);

    // Create next cursor if there are more results
    const nextCursor = this.createCursor(position + actualPageSize, totalCount, {
      pageSize: actualPageSize,
      requestedAt: new Date().toISOString()
    });

    return {
      results: items,
      nextCursor
    };
  }

  /**
   * Get pagination statistics
   */
  public getStats(): {
    activeCursors: number;
    config: PaginationConfig;
    oldestCursor?: string;
    newestCursor?: string;
  } {
    const cursors = Array.from(this.cursorCache.values());
    cursors.sort((a, b) => a.timestamp - b.timestamp);

    return {
      activeCursors: this.cursorCache.size,
      config: this.config,
      oldestCursor: cursors[0]?.cursor,
      newestCursor: cursors[cursors.length - 1]?.cursor
    };
  }

  /**
   * Clear all cursors
   */
  public clearCursors(): void {
    this.cursorCache.clear();
  }

  /**
   * Generate a unique cursor ID
   */
  private generateCursorId(): string {
    // Create an opaque cursor ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  /**
   * Clean up expired cursors
   */
  private cleanExpiredCursors(): void {
    const now = Date.now();
    const expiredCursors: string[] = [];

    for (const [cursorId, cursor] of this.cursorCache.entries()) {
      if (now - cursor.timestamp > this.config.cursorExpirationMs) {
        expiredCursors.push(cursorId);
      }
    }

    expiredCursors.forEach(cursorId => {
      this.cursorCache.delete(cursorId);
    });

    if (expiredCursors.length > 0) {
      // Optional: log cleanup
      process.stderr.write(`Cleaned up ${expiredCursors.length} expired pagination cursors\n`);
    }
  }
}

// Global pagination service instance
export const paginationService = new PaginationService();