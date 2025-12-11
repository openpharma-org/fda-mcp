/**
 * MCP Lifecycle Manager for FDA MCP Server
 * Implements MCP 2025-06-18 lifecycle specification compliance
 */

import { logger } from '../logging/index.js';
import { config } from '../config/index.js';
import {
  InitializeParams,
  InitializeResult,
  ClientCapabilities,
  ServerCapabilities,
  ConnectionState,
  LifecycleManager
} from '../types/lifecycle.js';

export class FdaLifecycleManager implements LifecycleManager {
  private connectionState: ConnectionState = 'disconnected';
  private clientCapabilities: ClientCapabilities | null = null;
  private supportedProtocolVersions = ['2025-06-18'];

  constructor() {
    this.updateConnectionState('disconnected');
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public updateConnectionState(newState: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = newState;

    logger.info('Connection state changed', {
      previousState,
      newState,
      timestamp: new Date().toISOString()
    }, {
      component: 'LIFECYCLE_MANAGER'
    });
  }

  public getClientCapabilities(): ClientCapabilities | null {
    return this.clientCapabilities;
  }

  public getServerCapabilities(): ServerCapabilities {
    return {
      tools: {
        listChanged: true
      },
      prompts: {
        listChanged: true
      },
      resources: {
        subscribe: true,
        listChanged: true
      },
      logging: {},
      completions: {},
      experimental: {
        progressNotifications: true,
        cancellationSupport: true,
        extendedMetadata: true
      }
    };
  }

  public async handleInitialize(params: InitializeParams): Promise<InitializeResult> {
    try {
      this.updateConnectionState('initializing');

      // Validate protocol version
      if (!this.supportedProtocolVersions.includes(params.protocolVersion)) {
        const error = new Error(
          `Unsupported protocol version: ${params.protocolVersion}. ` +
          `Supported versions: ${this.supportedProtocolVersions.join(', ')}`
        );

        logger.error('Protocol version mismatch', error, {
          component: 'LIFECYCLE_MANAGER'
        });

        throw error;
      }

      // Store client capabilities for feature negotiation
      this.clientCapabilities = params.capabilities;

      logger.info('Client initialization received', {
        protocolVersion: params.protocolVersion,
        clientName: params.clientInfo.name,
        clientVersion: params.clientInfo.version,
        clientCapabilities: params.capabilities
      }, {
        component: 'LIFECYCLE_MANAGER'
      });

      // Prepare server response
      const result: InitializeResult = {
        protocolVersion: params.protocolVersion,
        capabilities: this.getServerCapabilities(),
        serverInfo: {
          name: config.getConfig().name,
          version: config.getConfig().version,
          description: 'FDA MCP Server for drug and device information lookup with comprehensive safety and regulatory intelligence'
        }
      };

      this.updateConnectionState('initialized');

      logger.info('Server initialization completed', {
        protocolVersion: result.protocolVersion,
        serverCapabilities: result.capabilities,
        serverInfo: result.serverInfo
      }, {
        component: 'LIFECYCLE_MANAGER'
      });

      return result;

    } catch (error) {
      this.updateConnectionState('disconnected');

      logger.error('Initialize request failed', error as Error, {
        component: 'LIFECYCLE_MANAGER'
      });

      throw error;
    }
  }

  public async handleInitialized(): Promise<void> {
    try {
      if (this.connectionState !== 'initialized') {
        const error = new Error(
          `Invalid state for initialized notification. Expected 'initialized', got '${this.connectionState}'`
        );

        logger.error('Invalid initialized notification', error, {
          component: 'LIFECYCLE_MANAGER'
        });

        throw error;
      }

      this.updateConnectionState('ready');

      logger.info('Client initialization confirmed', {
        clientCapabilities: this.clientCapabilities,
        finalState: this.connectionState
      }, {
        component: 'LIFECYCLE_MANAGER'
      });

      // Perform any post-initialization setup
      await this.performPostInitializationSetup();

    } catch (error) {
      logger.error('Initialized notification failed', error as Error, {
        component: 'LIFECYCLE_MANAGER'
      });
      throw error;
    }
  }

  public async handleCancellation(params: { reason?: string }): Promise<void> {
    try {
      logger.info('Cancellation notification received', {
        reason: params.reason || 'No reason provided',
        connectionState: this.connectionState
      }, {
        component: 'LIFECYCLE_MANAGER'
      });

      // Handle any ongoing operations that need cancellation
      // This could integrate with existing cancellation token system

    } catch (error) {
      logger.error('Cancellation handling failed', error as Error, {
        component: 'LIFECYCLE_MANAGER'
      });
      throw error;
    }
  }

  private async performPostInitializationSetup(): Promise<void> {
    try {
      // Any setup that should happen after client confirms initialization
      logger.debug('Post-initialization setup completed', {}, {
        component: 'LIFECYCLE_MANAGER'
      });

    } catch (error) {
      logger.error('Post-initialization setup failed', error as Error, {
        component: 'LIFECYCLE_MANAGER'
      });
      throw error;
    }
  }

  public isFeatureSupported(feature: string): boolean {
    if (!this.clientCapabilities) {
      return false;
    }

    // Check if client supports a specific feature
    switch (feature) {
      case 'progress':
        return !!this.clientCapabilities.experimental?.progressNotifications;
      case 'cancellation':
        return !!this.clientCapabilities.experimental?.cancellationSupport;
      case 'sampling':
        return !!this.clientCapabilities.sampling;
      case 'roots':
        return !!this.clientCapabilities.roots;
      default:
        return false;
    }
  }

  public validateProtocolVersion(version: string): boolean {
    return this.supportedProtocolVersions.includes(version);
  }

  public getConnectionInfo() {
    return {
      state: this.connectionState,
      clientCapabilities: this.clientCapabilities,
      serverCapabilities: this.getServerCapabilities(),
      supportedVersions: this.supportedProtocolVersions
    };
  }
}