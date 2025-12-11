#!/usr/bin/env node

/**
 * Main entry point for the refactored FDA MCP Server
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fdaMcpServer } from './servers/fda-mcp.js';
import { logger } from './logging/index.js';
import { errorHandler } from './errors/index.js';

async function main(): Promise<void> {
  try {
    // Initialize the FDA MCP Server
    await fdaMcpServer.initialize();

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect the server to stdio transport
    await fdaMcpServer.getServer().connect(transport);

    // Log to stderr so it doesn't interfere with JSON-RPC
    process.stderr.write(`FDA MCP Server v${fdaMcpServer.getVersion()} running on stdio\n`);

    logger.info('FDA MCP Server connected and ready', {
      version: fdaMcpServer.getVersion(),
      uptime: fdaMcpServer.getUptime()
    }, {
      component: 'MAIN'
    });

  } catch (error) {
    const fdaError = errorHandler.handleUnexpectedError(error, 'main');

    process.stderr.write(`Server startup error: ${fdaError.message}\n`);
    logger.error('Server startup failed', fdaError, {
      component: 'MAIN',
      operation: 'startup'
    });

    // Attempt graceful shutdown
    try {
      await fdaMcpServer.shutdown();
    } catch (shutdownError) {
      process.stderr.write(`Shutdown error: ${shutdownError}\n`);
    }

    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully', {}, {
    component: 'MAIN'
  });

  try {
    await fdaMcpServer.shutdown();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Graceful shutdown failed: ${error}\n`);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully', {}, {
    component: 'MAIN'
  });

  try {
    await fdaMcpServer.shutdown();
    process.exit(0);
  } catch (error) {
    process.stderr.write(`Graceful shutdown failed: ${error}\n`);
    process.exit(1);
  }
});

// Start the server
main().catch(async (error) => {
  process.stderr.write(`Unhandled server error: ${error}\n`);

  try {
    await fdaMcpServer.shutdown();
  } catch (shutdownError) {
    process.stderr.write(`Emergency shutdown failed: ${shutdownError}\n`);
  }

  process.exit(1);
});