/**
 * MCP 2025-06-18 Request/Response Validation Service
 * Provides comprehensive validation for all MCP interactions
 */

import {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  validateMcpData,
  createMcpErrorResponse,
  createMcpSuccessResponse,
  SchemaRegistry
} from '../types/mcp-schemas.js';
import { mcpLogger } from '../logging/mcp-logger.js';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  errorCode?: number;
}

export interface McpValidationConfig {
  strictMode: boolean;
  logValidationErrors: boolean;
  includeDataInErrors: boolean;
}

/**
 * MCP Request/Response Validation Service
 */
export class McpValidationService {
  private config: McpValidationConfig;

  constructor(config?: Partial<McpValidationConfig>) {
    this.config = {
      strictMode: true,
      logValidationErrors: true,
      includeDataInErrors: false,
      ...config
    };
  }

  /**
   * Validate incoming JSON-RPC request
   */
  public validateRequest(request: unknown): ValidationResult<any> {
    const validation = validateMcpData(JsonRpcRequestSchema, request, 'JSON-RPC request');

    if (!validation.success) {
      if (this.config.logValidationErrors) {
        mcpLogger.warning('Invalid JSON-RPC request received', {
          errors: validation.errors,
          request: this.config.includeDataInErrors ? request : '[REDACTED]'
        });
      }

      return {
        success: false,
        errors: validation.errors,
        errorCode: -32600 // Invalid Request
      };
    }

    // Additional MCP-specific validation
    const mcpValidation = this.validateMcpRequest(validation.data);
    if (!mcpValidation.success) {
      return mcpValidation;
    }

    return {
      success: true,
      data: validation.data
    };
  }

  /**
   * Validate MCP-specific request requirements
   */
  private validateMcpRequest(request: any): ValidationResult<any> {
    // Validate JSON-RPC version
    if (request.jsonrpc !== '2.0') {
      return {
        success: false,
        errors: ['JSON-RPC version must be 2.0'],
        errorCode: -32600
      };
    }

    // Validate method format
    if (!this.isValidMcpMethod(request.method)) {
      return {
        success: false,
        errors: [`Invalid MCP method: ${request.method}`],
        errorCode: -32601 // Method not found
      };
    }

    // Validate parameters based on method
    const paramValidation = this.validateMethodParams(request.method, request.params);
    if (!paramValidation.success) {
      return paramValidation;
    }

    return { success: true, data: request };
  }

  /**
   * Check if method follows MCP naming conventions
   */
  private isValidMcpMethod(method: string): boolean {
    const validMcpMethods = [
      // Core MCP methods
      'initialize',
      'ping',
      'notifications/initialized',

      // Resource methods
      'resources/list',
      'resources/read',
      'resources/templates/list',
      'resources/subscribe',
      'resources/unsubscribe',

      // Tool methods
      'tools/list',
      'tools/call',

      // Prompt methods
      'prompts/list',
      'prompts/get',

      // Logging methods
      'logging/setLevel',

      // Completion methods
      'completion/complete',

      // Custom methods (health check)
      'health',

      // Notification methods
      'notifications/message',
      'notifications/progress',
      'notifications/cancelled'
    ];

    return validMcpMethods.includes(method) ||
           method.startsWith('tools/') ||
           method.startsWith('prompts/') ||
           method.startsWith('resources/') ||
           method.startsWith('notifications/');
  }

  /**
   * Validate method-specific parameters
   */
  private validateMethodParams(method: string, params: any): ValidationResult<any> {
    try {
      switch (method) {
        case 'tools/call':
          return this.validateToolCallParams(params);

        case 'prompts/get':
          return this.validatePromptGetParams(params);

        case 'resources/read':
          return this.validateResourceReadParams(params);

        case 'completion/complete':
          return this.validateCompletionParams(params);

        case 'logging/setLevel':
          return this.validateLoggingParams(params);

        default:
          // For unknown methods, basic validation
          return { success: true, data: params };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Parameter validation error: ${(error as Error).message}`],
        errorCode: -32602 // Invalid params
      };
    }
  }

  /**
   * Validate tool call parameters
   */
  private validateToolCallParams(params: any): ValidationResult<any> {
    if (!params || typeof params !== 'object') {
      return {
        success: false,
        errors: ['Tool call parameters must be an object'],
        errorCode: -32602
      };
    }

    if (!params.name || typeof params.name !== 'string') {
      return {
        success: false,
        errors: ['Tool call must include a valid tool name'],
        errorCode: -32602
      };
    }

    return { success: true, data: params };
  }

  /**
   * Validate prompt get parameters
   */
  private validatePromptGetParams(params: any): ValidationResult<any> {
    if (!params || typeof params !== 'object') {
      return {
        success: false,
        errors: ['Prompt parameters must be an object'],
        errorCode: -32602
      };
    }

    if (!params.name || typeof params.name !== 'string') {
      return {
        success: false,
        errors: ['Prompt request must include a valid prompt name'],
        errorCode: -32602
      };
    }

    return { success: true, data: params };
  }

  /**
   * Validate resource read parameters
   */
  private validateResourceReadParams(params: any): ValidationResult<any> {
    if (!params || typeof params !== 'object') {
      return {
        success: false,
        errors: ['Resource read parameters must be an object'],
        errorCode: -32602
      };
    }

    if (!params.uri || typeof params.uri !== 'string') {
      return {
        success: false,
        errors: ['Resource read must include a valid URI'],
        errorCode: -32602
      };
    }

    // Validate URI format
    const uriValidation = validateMcpData(SchemaRegistry.resourceUri, params.uri);
    if (!uriValidation.success) {
      return {
        success: false,
        errors: [`Invalid resource URI: ${uriValidation.errors.join(', ')}`],
        errorCode: -32602
      };
    }

    return { success: true, data: params };
  }

  /**
   * Validate completion parameters
   */
  private validateCompletionParams(params: any): ValidationResult<any> {
    if (!params || typeof params !== 'object') {
      return {
        success: false,
        errors: ['Completion parameters must be an object'],
        errorCode: -32602
      };
    }

    const required = ['ref', 'argument'];
    for (const field of required) {
      if (!params[field]) {
        return {
          success: false,
          errors: [`Completion request missing required field: ${field}`],
          errorCode: -32602
        };
      }
    }

    return { success: true, data: params };
  }

  /**
   * Validate logging parameters
   */
  private validateLoggingParams(params: any): ValidationResult<any> {
    if (!params || typeof params !== 'object') {
      return {
        success: false,
        errors: ['Logging parameters must be an object'],
        errorCode: -32602
      };
    }

    if (!params.level || typeof params.level !== 'string') {
      return {
        success: false,
        errors: ['Logging setLevel must include a valid level'],
        errorCode: -32602
      };
    }

    const validLevels = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'];
    if (!validLevels.includes(params.level)) {
      return {
        success: false,
        errors: [`Invalid log level: ${params.level}. Must be one of: ${validLevels.join(', ')}`],
        errorCode: -32602
      };
    }

    return { success: true, data: params };
  }

  /**
   * Validate outgoing response
   */
  public validateResponse(response: unknown): ValidationResult<any> {
    const validation = validateMcpData(JsonRpcResponseSchema, response, 'JSON-RPC response');

    if (!validation.success) {
      if (this.config.logValidationErrors) {
        mcpLogger.error('Invalid JSON-RPC response generated', {
          errors: validation.errors,
          response: this.config.includeDataInErrors ? response : '[REDACTED]'
        });
      }

      return {
        success: false,
        errors: validation.errors,
        errorCode: -32603 // Internal error
      };
    }

    return {
      success: true,
      data: validation.data
    };
  }

  /**
   * Create validated error response
   */
  public createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown
  ): any {
    const response = createMcpErrorResponse(id, code, message, data);

    // Validate the error response we're creating
    const validation = this.validateResponse(response);
    if (!validation.success) {
      // If our error response is invalid, create a minimal valid error
      return createMcpErrorResponse(id, -32603, 'Internal server error');
    }

    return response;
  }

  /**
   * Create validated success response
   */
  public createSuccessResponse(
    id: string | number | null,
    result: unknown
  ): any {
    const response = createMcpSuccessResponse(id, result);

    // Validate the success response we're creating
    const validation = this.validateResponse(response);
    if (!validation.success) {
      // If our success response is invalid, create an error response
      return this.createErrorResponse(id, -32603, 'Failed to create valid response', {
        originalValidationErrors: validation.errors
      });
    }

    return response;
  }

  /**
   * Get validation statistics
   */
  public getStats(): {
    config: McpValidationConfig;
    supportedMethods: string[];
    validationCount: number;
  } {
    return {
      config: this.config,
      supportedMethods: [
        'tools/call', 'prompts/get', 'resources/read',
        'completion/complete', 'logging/setLevel'
      ],
      validationCount: 0 // Could track this if needed
    };
  }
}

// Global MCP validation service
export const mcpValidator = new McpValidationService({
  strictMode: true,
  logValidationErrors: true,
  includeDataInErrors: false
});