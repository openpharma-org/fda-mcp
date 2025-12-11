/**
 * Main FDA MCP Server implementation
 */

// Removed crypto import as no longer needed for custom handlers
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config/index.js';
import { logger } from '../logging/index.js';
import { mcpLogger, McpLogMessage } from '../logging/mcp-logger.js';
import { errorHandler } from '../errors/index.js';
import { toolRegistry, registerDefaultTools } from '../tools/index.js';
import { promptRegistry, registerDefaultPrompts } from '../prompts/index.js';
import { resourceRegistry, registerDefaultResources } from '../resources/index.js';
import { cacheService } from '../utils/cache.js';
import { validateAndProcessEnvironment } from '../config/environment.js';
import { McpLogLevel } from '../types/index.js';
// Removed completion service imports as SDK handles completion automatically
import { FdaLifecycleManager } from '../utils/lifecycle-manager.js';

export interface ServerStats {
  uptime: number;
  version: string;
  toolsRegistered: number;
  promptsRegistered: number;
  resourcesRegistered: number;
  cacheStats: Record<string, unknown>;
  memoryUsage: NodeJS.MemoryUsage;
  connectionState: string;
  protocolCompliance: string;
}

export class FdaMcpServer {
  private server: McpServer;
  private startTime: Date;
  private isInitialized = false;
  private lifecycleManager: FdaLifecycleManager;

  constructor() {
    this.startTime = new Date();
    this.lifecycleManager = new FdaLifecycleManager();
    this.server = new McpServer(
      {
        name: config.getConfig().name,
        version: config.getConfig().version,
        description: 'FDA MCP Server for drug and device information lookup with comprehensive safety and regulatory intelligence'
      },
      {
        capabilities: this.lifecycleManager.getServerCapabilities()
      }
    );

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error, {
        component: 'FDA_MCP_SERVER',
        operation: 'uncaughtException'
      });

      // Graceful shutdown
      this.shutdown().then(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
      logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        component: 'FDA_MCP_SERVER',
        operation: 'unhandledRejection'
      });
    });

    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal', {}, {
        component: 'FDA_MCP_SERVER'
      });
      this.shutdown().then(() => {
        process.exit(0);
      });
    });

    // Handle SIGINT (Ctrl+C) for graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal', {}, {
        component: 'FDA_MCP_SERVER'
      });
      this.shutdown().then(() => {
        process.exit(0);
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      logger.serverStart(config.getConfig() as any);

      // Setup MCP logger with notification callback
      this.setupMcpLogging();

      // Validate environment
      validateAndProcessEnvironment();
      logger.info('Environment validation passed', {}, {
        component: 'FDA_MCP_SERVER'
      });

      // Validate configuration
      config.validateConfig();
      logger.info('Configuration validation passed', {}, {
        component: 'FDA_MCP_SERVER'
      });

      // Register tools
      await this.registerTools();

      // Register prompts
      await this.registerPrompts();

      // Register resources
      await this.registerResources();

      // Setup request handlers
      this.setupRequestHandlers();

      // Setup lifecycle handlers
      this.setupLifecycleHandlers();

      this.isInitialized = true;

      logger.serverReady();

    } catch (error) {
      const fdaError = errorHandler.handleUnexpectedError(error, 'FdaMcpServer.initialize');
      logger.error('Server initialization failed', fdaError, {
        component: 'FDA_MCP_SERVER',
        operation: 'initialize'
      });
      throw fdaError;
    }
  }

  private async registerTools(): Promise<void> {
    try {
      await registerDefaultTools(this.server);
      logger.info('Tools registered successfully', {
        toolCount: toolRegistry.tools.size
      }, {
        component: 'FDA_MCP_SERVER'
      });
    } catch (error) {
      throw errorHandler.handleUnexpectedError(error, 'FdaMcpServer.registerTools');
    }
  }

  private async registerPrompts(): Promise<void> {
    try {
      await registerDefaultPrompts(this.server);
      logger.info('Prompts registered successfully', {
        promptCount: promptRegistry.prompts.size
      }, {
        component: 'FDA_MCP_SERVER'
      });
    } catch (error) {
      throw errorHandler.handleUnexpectedError(error, 'FdaMcpServer.registerPrompts');
    }
  }

  private async registerResources(): Promise<void> {
    try {
      await registerDefaultResources(this.server);
      logger.info('Resources registered successfully', {
        resourceCount: resourceRegistry.count()
      }, {
        component: 'FDA_MCP_SERVER'
      });
    } catch (error) {
      throw errorHandler.handleUnexpectedError(error, 'FdaMcpServer.registerResources');
    }
  }

  private setupLifecycleHandlers(): void {
    // The new MCP SDK handles lifecycle events automatically through the transport layer
    // No manual lifecycle handlers are needed in the current API
    try {
      // Initialize the lifecycle manager for tracking connection state
      this.lifecycleManager.getConnectionState();

      logger.info('Lifecycle management initialized', {
        connectionState: this.lifecycleManager.getConnectionState(),
        usingSDKDefaults: true
      }, {
        component: 'FDA_MCP_SERVER'
      });

    } catch (error) {
      logger.warn('Lifecycle initialization failed', {
        error: (error as Error).message
      }, {
        component: 'FDA_MCP_SERVER'
      });
    }
  }

  private setupMcpLogging(): void {
    // Setup MCP logger notification callback
    mcpLogger.setNotificationCallback((logMessage: McpLogMessage) => {
      try {
        // Send log notification to MCP client
        if ('notification' in this.server) {
          (this.server as any).notification('notifications/message', logMessage);
        }
      } catch (error) {
        // Fallback to stderr to avoid recursive logging
        process.stderr.write(`Failed to send MCP log notification: ${(error as Error).message}\n`);
      }
    });

    // Set initial log level from config
    const configLevel = config.getLogLevel();
    const mcpLevel: McpLogLevel = configLevel === 'warn' ? 'warning' : configLevel as McpLogLevel;
    mcpLogger.setLevel(mcpLevel);
  }

  private setupRequestHandlers(): void {
    // The new MCP SDK automatically handles standard request types like tools, prompts, resources, and completion
    // Custom request handlers are no longer needed for standard MCP functionality
    try {
      logger.info('Request handlers setup completed', {
        note: 'Using MCP SDK automatic request handling',
        sdkVersion: '1.18.1'
      }, {
        component: 'FDA_MCP_SERVER'
      });

    } catch (error) {
      logger.warn('Request handlers setup failed', {
        error: (error as Error).message
      }, {
        component: 'FDA_MCP_SERVER'
      });
    }
  }

  public async getHealthStatus(requestId: string): Promise<{
    status: string;
    timestamp: string;
    version: string;
    uptime: number;
    checks: Record<string, boolean>;
  }> {
    try {
      // Perform health checks
      const toolHealthCheck = await toolRegistry.healthCheck(requestId);
      const allToolsHealthy = Object.values(toolHealthCheck).every(Boolean);

      // Simple API connectivity check
      const fdaInfoTool = toolRegistry.get('fda_info');
      const apiHealthy = fdaInfoTool ? await (fdaInfoTool as any).healthCheck(requestId) : false;

      return {
        status: allToolsHealthy && apiHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: config.getConfig().version,
        uptime: Date.now() - this.startTime.getTime(),
        checks: {
          tools: allToolsHealthy,
          api: apiHealthy,
          cache: true, // Cache service is always available
          config: true  // If we got here, config is valid
        }
      };
    } catch (error) {
      logger.error('Health check failed', error as Error, {
        component: 'FDA_MCP_SERVER',
        requestId,
        operation: 'getHealthStatus'
      });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: config.getConfig().version,
        uptime: Date.now() - this.startTime.getTime(),
        checks: {
          tools: false,
          api: false,
          cache: false,
          config: false
        }
      };
    }
  }

  public getLifecycleManager(): FdaLifecycleManager {
    return this.lifecycleManager;
  }

  public getStats(): ServerStats {
    return {
      uptime: Date.now() - this.startTime.getTime(),
      version: config.getConfig().version,
      toolsRegistered: toolRegistry.tools.size,
      promptsRegistered: promptRegistry.prompts.size,
      resourcesRegistered: resourceRegistry.count(),
      cacheStats: cacheService.getStats() as any,
      memoryUsage: process.memoryUsage(),
      connectionState: this.lifecycleManager.getConnectionState(),
      protocolCompliance: 'MCP 2025-06-18'
    };
  }

  public async clearCaches(requestId?: string): Promise<void> {
    try {
      cacheService.clear(requestId);
      toolRegistry.clearCaches(requestId);
      promptRegistry.clearCaches(requestId);

      logger.info('All caches cleared', {}, {
        component: 'FDA_MCP_SERVER',
        requestId
      });
    } catch (error) {
      throw errorHandler.handleUnexpectedError(error, 'FdaMcpServer.clearCaches', requestId);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      logger.serverShutdown();

      // Dispose of registries
      toolRegistry.dispose();
      promptRegistry.dispose();

      // Dispose of cache service
      cacheService.dispose();

      logger.info('Server shutdown completed', {}, {
        component: 'FDA_MCP_SERVER'
      });
    } catch (error) {
      logger.error('Error during server shutdown', error as Error, {
        component: 'FDA_MCP_SERVER',
        operation: 'shutdown'
      });
    }
  }

  public getServer(): McpServer {
    return this.server;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  public getVersion(): string {
    return config.getConfig().version;
  }
}

// Create and export singleton instance
export const fdaMcpServer = new FdaMcpServer();