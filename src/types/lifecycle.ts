/**
 * MCP Lifecycle types for FDA MCP Server
 * Implements MCP 2025-06-18 lifecycle specification
 */

export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
    description?: string;
  };
}

export interface ClientCapabilities {
  experimental?: Record<string, unknown>;
  sampling?: Record<string, unknown>;
  roots?: {
    listChanged?: boolean;
  };
}

export interface ServerCapabilities {
  [x: string]: unknown;
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  logging?: Record<string, unknown>;
  completions?: Record<string, unknown>;
  experimental?: {
    progressNotifications?: boolean;
    cancellationSupport?: boolean;
    extendedMetadata?: boolean;
  };
}

export type ConnectionState = 'disconnected' | 'initializing' | 'initialized' | 'ready';

export interface LifecycleManager {
  getConnectionState(): ConnectionState;
  updateConnectionState(newState: ConnectionState): void;
  getClientCapabilities(): ClientCapabilities | null;
  getServerCapabilities(): ServerCapabilities;
  handleInitialize(params: InitializeParams): Promise<InitializeResult>;
  handleInitialized(): Promise<void>;
  handleCancellation(params: { reason?: string }): Promise<void>;
}