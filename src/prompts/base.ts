/**
 * Base prompt class with hybrid registration for FDA MCP Server
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import {
  PromptDefinition,
  PromptExecutionResult,
  LegacyPromptSchema
} from '../types/index.js';
import { createRequestId, sanitizeError } from '../types/schemas.js';

/**
 * Abstract base class for all FDA MCP prompts with hybrid registration
 */
export abstract class BasePrompt<TParams = Record<string, unknown>> {
  protected promptName: string;
  protected description: string;
  protected argsSchema: Record<string, z.ZodSchema>;

  constructor(
    promptName: string,
    description: string,
    argsSchema: Record<string, z.ZodSchema>
  ) {
    this.promptName = promptName;
    this.description = description;
    this.argsSchema = argsSchema;
  }

  /**
   * Get the prompt definition for modern MCP
   */
  getPromptDefinition(): PromptDefinition {
    return {
      name: this.promptName,
      description: this.description,
      argsSchema: this.argsSchema
    };
  }

  /**
   * Get the legacy prompt schema for compatibility
   */
  getLegacyPromptSchema(): LegacyPromptSchema {
    return {
      name: this.promptName,
      description: this.description,
      arguments: Object.entries(this.argsSchema).map(([name, schema]) => ({
        name,
        description: schema.description || `${name} parameter`,
        required: !schema.isOptional()
      }))
    };
  }

  /**
   * Register this prompt with hybrid approach
   */
  register(server: McpServer): void {
    // Modern registration
    this.registerModern(server);

    // Legacy registration
    this.registerLegacy(server);
  }

  /**
   * Modern API registration
   */
  private registerModern(server: McpServer): void {
    try {
      if ('registerPrompt' in server && typeof server.registerPrompt === 'function') {
        const argsSchemaShape = Object.fromEntries(
          Object.entries(this.argsSchema).map(([key, schema]) => [
            key, 'shape' in schema ? schema.shape : {}
          ])
        );

        (server as any).registerPrompt(this.promptName, {
          description: this.description,
          argsSchema: argsSchemaShape
        }, async (args: any) => {
          return this.safeExecute(args);
        });
      }
    } catch (error) {
      // Modern registration might fail on older servers, that's OK
      this.log('warn', `Modern prompt registration failed for ${this.promptName}`, { error });
    }
  }

  /**
   * Legacy API registration
   */
  private registerLegacy(server: McpServer): void {
    const underlyingServer = this.getUnderlyingServer(server);

    if (underlyingServer && underlyingServer.setRequestHandler) {
      try {
        // We need to track all prompts for the list handler
        if (!underlyingServer._fdaPrompts) {
          underlyingServer._fdaPrompts = new Map();

          // Register the list handler once
          underlyingServer.setRequestHandler(ListPromptsRequestSchema, () => ({
            prompts: Array.from(underlyingServer._fdaPrompts.values())
          }));

          // Register the get handler once
          underlyingServer.setRequestHandler(GetPromptRequestSchema, async (request: any) => {
            const { name, arguments: args } = request.params;
            const promptInstance = underlyingServer._fdaPromptInstances?.get(name);

            if (promptInstance) {
              return promptInstance.safeExecute(args || {});
            }

            throw new Error(`Prompt not found: ${name}`);
          });

          // Track prompt instances for execution
          underlyingServer._fdaPromptInstances = new Map();
        }

        // Add this prompt to the collections
        underlyingServer._fdaPrompts.set(this.promptName, this.getLegacyPromptSchema());
        underlyingServer._fdaPromptInstances.set(this.promptName, this);

      } catch (error) {
        this.log('error', `Legacy prompt registration failed for ${this.promptName}`, { error });
      }
    } else {
      this.log('warn', `Unable to access underlying server for legacy registration of ${this.promptName}`);
    }
  }

  /**
   * Get the underlying server instance for legacy registration
   */
  private getUnderlyingServer(server: McpServer): any {
    return (server as any)._server || (server as any).server || server;
  }

  /**
   * Safely execute the prompt with error handling and validation
   */
  private async safeExecute(params: unknown): Promise<PromptExecutionResult> {
    const requestId = createRequestId();

    try {
      // Validate parameters
      const validatedParams = this.validateParams(params);

      // Execute the prompt
      return await this.execute(validatedParams, requestId);

    } catch (error) {
      const sanitized = sanitizeError(error);

      // Return error as a prompt result
      return {
        description: `Error in ${this.promptName}: ${sanitized.message}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Error executing prompt "${this.promptName}": ${sanitized.message}`
            }
          }
        ]
      };
    }
  }

  /**
   * Validate prompt parameters using the schema
   */
  protected validateParams(params: unknown): TParams {
    if (!params || typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    const validated: any = {};

    for (const [key, schema] of Object.entries(this.argsSchema)) {
      const value = (params as any)[key];
      const result = schema.safeParse(value);

      if (!result.success) {
        const errors = result.error.errors.map(err => err.message).join(', ');
        throw new Error(`Parameter '${key}' validation failed: ${errors}`);
      }

      validated[key] = result.data;
    }

    return validated;
  }

  /**
   * Abstract method to be implemented by concrete prompts
   */
  protected abstract execute(
    params: TParams,
    requestId: string
  ): Promise<PromptExecutionResult>;

  /**
   * Log prompt execution for debugging
   */
  protected log(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      prompt: this.promptName,
      message,
      data
    };

    // Use stderr for all logging to avoid interfering with JSON-RPC
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  }

  /**
   * Create a standard prompt result
   */
  protected createPromptResult(
    description: string,
    promptText: string
  ): PromptExecutionResult {
    return {
      description,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText
          }
        }
      ]
    };
  }

  /**
   * Get prompt name
   */
  getName(): string {
    return this.promptName;
  }

  /**
   * Get prompt description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get prompt arguments schema
   */
  getArgsSchema(): Record<string, z.ZodSchema> {
    return this.argsSchema;
  }
}