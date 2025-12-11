/**
 * Base resource class for FDA MCP Server
 * Resources provide context and data for users or AI models
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: Uint8Array;
  metadata?: Record<string, unknown>;
}

/**
 * Abstract base class for all FDA MCP resources
 */
export abstract class BaseResource {
  protected resourceUri: string;
  protected name: string;
  protected description: string;
  protected mimeType: string;

  constructor(
    resourceUri: string,
    name: string,
    description: string,
    mimeType: string = 'text/plain'
  ) {
    this.resourceUri = resourceUri;
    this.name = name;
    this.description = description;
    this.mimeType = mimeType;
  }

  /**
   * Get the resource definition for MCP registration
   */
  getResourceDefinition(): ResourceDefinition {
    return {
      uri: this.resourceUri,
      name: this.name,
      description: this.description,
      mimeType: this.mimeType
    };
  }

  /**
   * Register this resource with the MCP server using native SDK support
   */
  register(server: McpServer): void {
    try {
      // Use the native SDK resource registration
      (server as any).registerResource(
        this.name,
        this.resourceUri,
        {
          title: this.name,
          description: this.description,
          mimeType: this.mimeType
        },
        async (uri: URL) => {
          const content = await this.getContent();
          return {
            contents: [{
              uri: uri.href,
              mimeType: content.mimeType,
              text: content.text,
              blob: content.blob
            }]
          };
        }
      );
    } catch (error) {
      // Fallback to legacy resource method if registerResource is not available
      try {
        (server as any).resource(
          {
            uri: this.resourceUri,
            name: this.name,
            description: this.description,
            mimeType: this.mimeType
          },
          async () => {
            const content = await this.getContent();
            return {
              contents: [{
                uri: this.resourceUri,
                mimeType: content.mimeType,
                text: content.text,
                blob: content.blob
              }]
            };
          }
        );
      } catch (legacyError) {
        throw new Error(`Failed to register resource with both modern and legacy methods: ${(error as Error).message}, ${(legacyError as Error).message}`);
      }
    }
  }

  /**
   * Abstract method to get resource content
   */
  abstract getContent(params?: Record<string, unknown>): Promise<ResourceContent>;

  /**
   * Get resource URI
   */
  getUri(): string {
    return this.resourceUri;
  }

  /**
   * Get resource name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get resource description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Get resource MIME type
   */
  getMimeType(): string {
    return this.mimeType;
  }
}