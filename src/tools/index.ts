/**
 * Tool registry and management for FDA MCP Server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BaseTool } from './base.js';
import { FdaInfoTool } from './fda-info.js';
import { logger } from '../logging/index.js';
import { paginationService, PaginatedRequest, PaginatedResponse } from '../utils/pagination.js';

export interface ToolListItem {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface ToolRegistry {
  tools: Map<string, BaseTool>;
  register(tool: BaseTool): void;
  registerAll(server: McpServer): void;
  get(name: string): BaseTool | undefined;
  list(): BaseTool[];
  listPaginated(request: PaginatedRequest): PaginatedResponse<ToolListItem>;
  healthCheck(requestId: string): Promise<Record<string, boolean>>;
  getStats(): Record<string, unknown>;
  clearCaches(requestId?: string): void;
}

export class FdaToolRegistry implements ToolRegistry {
  public tools: Map<string, BaseTool>;

  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  private initializeTools(): void {
    // Register all available tools
    const fdaInfoTool = new FdaInfoTool();
    this.register(fdaInfoTool as any);

    logger.info('Tool registry initialized', {
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys())
    }, {
      component: 'TOOL_REGISTRY'
    });
  }

  public register(tool: BaseTool): void {
    const toolName = tool.getName();

    if (this.tools.has(toolName)) {
      logger.warn(`Tool ${toolName} is already registered, overwriting`, {
        toolName
      }, {
        component: 'TOOL_REGISTRY'
      });
    }

    this.tools.set(toolName, tool);

    logger.debug('Tool registered', {
      toolName,
      description: tool.getDescription()
    }, {
      component: 'TOOL_REGISTRY'
    });
  }

  public registerAll(server: McpServer): void {
    const registeredTools: string[] = [];
    const failedTools: string[] = [];

    for (const [name, tool] of this.tools) {
      try {
        tool.register(server);
        registeredTools.push(name);

        logger.debug('Tool registered with MCP server', {
          toolName: name
        }, {
          component: 'TOOL_REGISTRY'
        });
      } catch (error) {
        failedTools.push(name);

        logger.error(`Failed to register tool ${name}`, error as Error, {
          component: 'TOOL_REGISTRY',
          operation: 'registerAll'
        });
      }
    }

    logger.info('Tools registration completed', {
      registered: registeredTools,
      failed: failedTools,
      totalCount: this.tools.size
    }, {
      component: 'TOOL_REGISTRY'
    });

    if (failedTools.length > 0) {
      throw new Error(`Failed to register tools: ${failedTools.join(', ')}`);
    }
  }

  public get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  public list(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  public listPaginated(request: PaginatedRequest): PaginatedResponse<ToolListItem> {
    const allTools = Array.from(this.tools.values()).map(tool => ({
      name: tool.getName(),
      description: tool.getDescription(),
      schema: this.extractSchemaDefinition(tool.getSchema())
    }));

    return paginationService.paginateArray(allTools, request);
  }

  private extractSchemaDefinition(schema: any): Record<string, unknown> {
    try {
      // Extract Zod schema definition for MCP compatibility
      if (schema && 'shape' in schema) {
        const shape: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(schema.shape)) {
          // Simplified schema extraction
          shape[key] = {
            type: this.getZodType(value),
            description: this.getZodDescription(value)
          };
        }
        return {
          type: 'object',
          properties: shape,
          required: this.getRequiredFields(schema)
        };
      }
      return { type: 'object' };
    } catch (error) {
      logger.warn('Failed to extract schema definition', { error: (error as Error).message }, {
        component: 'TOOL_REGISTRY'
      });
      return { type: 'object' };
    }
  }

  private getZodType(zodSchema: any): string {
    if (!zodSchema || typeof zodSchema !== 'object') return 'unknown';

    const typeName = zodSchema.constructor?.name || 'unknown';
    switch (typeName) {
      case 'ZodString': return 'string';
      case 'ZodNumber': return 'number';
      case 'ZodBoolean': return 'boolean';
      case 'ZodArray': return 'array';
      case 'ZodObject': return 'object';
      case 'ZodEnum': return 'string';
      case 'ZodOptional': return this.getZodType(zodSchema._def?.innerType);
      default: return 'unknown';
    }
  }

  private getZodDescription(zodSchema: any): string | undefined {
    try {
      return zodSchema._def?.description;
    } catch {
      return undefined;
    }
  }

  private getRequiredFields(schema: any): string[] {
    try {
      if (schema && schema._def && schema._def.shape) {
        const required: string[] = [];
        for (const [key, value] of Object.entries(schema._def.shape)) {
          // Check if field is optional
          if (!(value as any)._def?.typeName?.includes('Optional')) {
            required.push(key);
          }
        }
        return required;
      }
      return [];
    } catch {
      return [];
    }
  }

  public async healthCheck(requestId: string): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const healthCheckPromises = Array.from(this.tools.entries()).map(
      async ([name, tool]) => {
        try {
          // Check if tool has a health check method
          if ('healthCheck' in tool && typeof tool.healthCheck === 'function') {
            const isHealthy = await (tool as any).healthCheck(requestId);
            results[name] = isHealthy;
          } else {
            // Default to true if no health check method
            results[name] = true;
          }
        } catch (error) {
          logger.error(`Health check failed for tool ${name}`, error as Error, {
            component: 'TOOL_REGISTRY',
            requestId,
            operation: 'healthCheck'
          });
          results[name] = false;
        }
      }
    );

    await Promise.all(healthCheckPromises);

    const healthyCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    logger.info('Tool health check completed', {
      healthy: healthyCount,
      total: totalCount,
      results
    }, {
      component: 'TOOL_REGISTRY',
      requestId
    });

    return results;
  }

  public getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {
      toolCount: this.tools.size,
      tools: {}
    };

    for (const [name, tool] of this.tools) {
      try {
        // Get tool-specific stats if available
        if ('getStats' in tool && typeof tool.getStats === 'function') {
          (stats.tools as any)[name] = (tool as any).getStats();
        } else {
          (stats.tools as any)[name] = {
            name: tool.getName(),
            description: tool.getDescription()
          };
        }
      } catch (error) {
        logger.error(`Failed to get stats for tool ${name}`, error as Error, {
          component: 'TOOL_REGISTRY',
          operation: 'getStats'
        });

        (stats.tools as any)[name] = { error: 'Failed to get stats' };
      }
    }

    return stats;
  }

  public clearCaches(requestId?: string): void {
    let clearedCount = 0;

    for (const [name, tool] of this.tools) {
      try {
        // Clear cache if tool supports it
        if ('clearCache' in tool && typeof tool.clearCache === 'function') {
          (tool as any).clearCache(requestId);
          clearedCount++;
        }
      } catch (error) {
        logger.error(`Failed to clear cache for tool ${name}`, error as Error, {
          component: 'TOOL_REGISTRY',
          requestId,
          operation: 'clearCaches'
        });
      }
    }

    logger.info('Tool caches cleared', {
      clearedCount,
      totalTools: this.tools.size
    }, {
      component: 'TOOL_REGISTRY',
      requestId
    });
  }

  public dispose(): void {
    // Clean up resources
    for (const [name, tool] of this.tools) {
      try {
        // Call dispose if tool supports it
        if ('dispose' in tool && typeof tool.dispose === 'function') {
          (tool as any).dispose();
        }
      } catch (error) {
        logger.error(`Failed to dispose tool ${name}`, error as Error, {
          component: 'TOOL_REGISTRY',
          operation: 'dispose'
        });
      }
    }

    this.tools.clear();

    logger.info('Tool registry disposed', {}, {
      component: 'TOOL_REGISTRY'
    });
  }
}

// Create singleton instance
export const toolRegistry = new FdaToolRegistry();

// Export tool classes for direct use
export { FdaInfoTool } from './fda-info.js';
export { BaseTool } from './base.js';

// Utility functions
export function createToolRegistry(): FdaToolRegistry {
  return new FdaToolRegistry();
}

export async function registerDefaultTools(server: McpServer): Promise<void> {
  try {
    // Import settings manager (done here to avoid circular dependencies)
    const { settingsManager } = await import('../config/settings.js');
    const settings = settingsManager.getSettings();

    if (!settings.features.tools.enabled) {
      logger.info('Tools are disabled in configuration', {}, {
        component: 'TOOL_REGISTRY'
      });
      return;
    }

    const enabledTools = settingsManager.getEnabledTools();
    logger.info('Registering enabled tools', {
      enabledTools: enabledTools,
      totalAvailable: toolRegistry.tools.size
    }, {
      component: 'TOOL_REGISTRY'
    });

    // Register only enabled tools
    if (enabledTools.includes('fda_info')) {
      toolRegistry.registerAll(server);
    }
  } catch (error) {
    logger.error('Failed to load settings for tools, registering all tools', error as Error, {
      component: 'TOOL_REGISTRY'
    });
    toolRegistry.registerAll(server);
  }
}