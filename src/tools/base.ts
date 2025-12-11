/**
 * Base tool class for FDA MCP Server
 */

import { z } from 'zod';
import { ServerResult } from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ToolDefinition,
  ToolExecutionResult,
  FdaError,
  FdaErrorType
} from '../types/index.js';
import { createRequestId, sanitizeError } from '../types/schemas.js';

/**
 * Progress tracking for long-running tool operations
 */
export interface ToolProgress {
  requestId: string;
  stage: string;
  progress: number; // 0-100
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Cancellation token for tool operations
 */
export interface CancellationToken {
  isCancelled: boolean;
  reason?: string;
  cancel(reason?: string): void;
  onCancel(callback: (reason?: string) => void): void;
}

/**
 * Implementation of cancellation token
 */
export class ToolCancellationToken implements CancellationToken {
  private _cancelled = false;
  private _reason?: string;
  private _callbacks: Array<(reason?: string) => void> = [];

  get isCancelled(): boolean {
    return this._cancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  cancel(reason?: string): void {
    if (this._cancelled) return;

    this._cancelled = true;
    this._reason = reason;

    // Notify all callbacks
    this._callbacks.forEach(callback => {
      try {
        callback(reason);
      } catch (_error) {
        // Ignore callback errors to prevent cascading failures
      }
    });
  }

  onCancel(callback: (reason?: string) => void): void {
    if (this._cancelled) {
      callback(this._reason);
    } else {
      this._callbacks.push(callback);
    }
  }
}

/**
 * Abstract base class for all FDA MCP tools
 */
export abstract class BaseTool<TParams = Record<string, unknown>> {
  protected toolName: string;
  protected description: string;
  protected schema: z.ZodSchema;
  private activeOperations = new Map<string, ToolCancellationToken>();
  private progressCallbacks = new Map<string, (progress: ToolProgress) => void>();

  constructor(toolName: string, description: string, schema: z.ZodSchema) {
    this.toolName = toolName;
    this.description = description;
    this.schema = schema;
  }

  /**
   * Get the tool definition for MCP registration
   */
  getToolDefinition(): ToolDefinition {
    return {
      name: this.toolName,
      description: this.description,
      schema: this.schema
    };
  }

  /**
   * Register this tool with the MCP server
   */
  register(server: McpServer): void {
    // Extract the shape from the Zod schema
    const schemaShape = 'shape' in this.schema ? this.schema.shape : {};

    (server as any).tool(
      this.toolName,
      this.description,
      schemaShape,
      async (args: any) => {
        return this.safeExecute(args);
      }
    );
  }

  /**
   * Safely execute the tool with error handling and validation
   */
  private async safeExecute(params: unknown): Promise<ServerResult> {
    const requestId = createRequestId();
    const startTime = Date.now();
    const cancellationToken = new ToolCancellationToken();

    // Register the operation for potential cancellation
    this.activeOperations.set(requestId, cancellationToken);

    try {
      // Validate parameters
      const validatedParams = this.validateParams(params);

      // Report initial progress
      this.reportProgress(requestId, {
        requestId,
        stage: 'validation',
        progress: 10,
        message: 'Parameters validated',
        timestamp: new Date().toISOString()
      });

      // Check for cancellation before execution
      if (cancellationToken.isCancelled) {
        throw new Error(`Operation cancelled: ${cancellationToken.reason || 'No reason provided'}`);
      }

      // Execute the tool with cancellation support
      const result = await this.executeWithCancellation(validatedParams, requestId, cancellationToken);

      // Add execution metadata
      const executionTime = Date.now() - startTime;

      // Report completion
      this.reportProgress(requestId, {
        requestId,
        stage: 'completed',
        progress: 100,
        message: 'Tool execution completed',
        timestamp: new Date().toISOString(),
        details: { executionTime }
      });

      if (result.success && result.data) {
        return this.formatSuccessResponse(result.data, {
          executionTime,
          requestId,
          cancelled: false
        });
      } else {
        return this.formatErrorResponse(
          result.error?.error || 'Tool execution failed',
          result.error?.code,
          requestId
        );
      }

    } catch (error) {
      const sanitized = sanitizeError(error);

      // Check if this was a cancellation
      const wasCancelled = cancellationToken.isCancelled ||
                          sanitized.message.includes('cancelled') ||
                          sanitized.message.includes('aborted');

      if (wasCancelled) {
        this.reportProgress(requestId, {
          requestId,
          stage: 'cancelled',
          progress: -1,
          message: 'Operation cancelled',
          timestamp: new Date().toISOString(),
          details: { reason: cancellationToken.reason }
        });
      }

      return this.formatErrorResponse(
        sanitized.message,
        sanitized.code || (wasCancelled ? 'OPERATION_CANCELLED' : 'EXECUTION_ERROR'),
        requestId
      );
    } finally {
      // Clean up the operation
      this.activeOperations.delete(requestId);
      this.progressCallbacks.delete(requestId);
    }
  }

  /**
   * Validate tool parameters using the schema with MCP compliance
   */
  protected validateParams(params: unknown): TParams {
    const result = this.schema.safeParse(params);

    if (!result.success) {
      const errors = result.error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });

      // Create MCP-compliant validation error
      const mcpError = new Error(`MCP schema validation failed: ${errors.join(', ')}`);
      (mcpError as any).code = 'INVALID_PARAMS';
      (mcpError as any).data = {
        validationErrors: errors,
        receivedParams: params,
        toolName: this.toolName
      };

      throw mcpError;
    }

    return result.data;
  }

  /**
   * Execute tool with cancellation support - wrapper around execute
   */
  private async executeWithCancellation(
    params: TParams,
    requestId: string,
    cancellationToken: CancellationToken
  ): Promise<ToolExecutionResult> {
    // Report execution start
    this.reportProgress(requestId, {
      requestId,
      stage: 'executing',
      progress: 20,
      message: 'Starting tool execution',
      timestamp: new Date().toISOString()
    });

    // Check for cancellation before starting
    if (cancellationToken.isCancelled) {
      throw new Error(`Operation cancelled before execution: ${cancellationToken.reason || 'No reason provided'}`);
    }

    // Execute the tool - tools can check cancellationToken.isCancelled during execution
    return await this.execute(params, requestId, cancellationToken);
  }

  /**
   * Abstract method to be implemented by concrete tools
   */
  protected abstract execute(
    params: TParams,
    requestId: string,
    cancellationToken?: CancellationToken
  ): Promise<ToolExecutionResult>;

  /**
   * Report progress for long-running operations
   */
  protected reportProgress(requestId: string, progress: ToolProgress): void {
    const callback = this.progressCallbacks.get(requestId);
    if (callback) {
      try {
        callback(progress);
      } catch (_error) {
        // Ignore callback errors
      }
    }

    // Also log progress
    this.log('debug', 'Tool progress update', {
      requestId,
      stage: progress.stage,
      progress: progress.progress,
      message: progress.message
    });
  }

  /**
   * Cancel an active operation
   */
  public cancelOperation(requestId: string, reason?: string): boolean {
    const token = this.activeOperations.get(requestId);
    if (token) {
      token.cancel(reason);
      return true;
    }
    return false;
  }

  /**
   * Get active operations for this tool
   */
  public getActiveOperations(): Array<{requestId: string; startTime: Date}> {
    return Array.from(this.activeOperations.keys()).map(requestId => ({
      requestId,
      startTime: new Date() // Simplified - could track actual start times
    }));
  }

  /**
   * Set progress callback for an operation
   */
  public setProgressCallback(requestId: string, callback: (progress: ToolProgress) => void): void {
    this.progressCallbacks.set(requestId, callback);
  }

  /**
   * Format successful tool response
   */
  protected formatSuccessResponse(
    data: Record<string, unknown>,
    metadata?: { executionTime: number; requestId: string; cancelled?: boolean }
  ): ServerResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data,
            metadata: {
              ...metadata,
              tool: this.toolName,
              timestamp: new Date().toISOString(),
              mcpSpecVersion: '2025-06-18'
            }
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Format error response
   */
  protected formatErrorResponse(
    error: string,
    code?: string,
    requestId?: string
  ): ServerResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error,
            code,
            requestId
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Create a standardized FDA error
   */
  protected createFdaError(
    message: string,
    type: FdaErrorType,
    code: string,
    details?: Record<string, unknown>,
    requestId?: string
  ): FdaError {
    const error = new Error(message) as FdaError;
    error.type = type;
    error.code = code;
    error.details = details;
    error.requestId = requestId;
    return error;
  }

  /**
   * Log tool execution for debugging
   */
  protected log(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      tool: this.toolName,
      message,
      data
    };

    // Use stderr for all logging to avoid interfering with JSON-RPC
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  }

  /**
   * Get tool name
   */
  getName(): string {
    return this.toolName;
  }

  /**
   * Get tool description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get tool schema
   */
  getSchema(): z.ZodSchema {
    return this.schema;
  }
}