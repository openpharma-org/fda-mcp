# MCP SDK Migration Guide: Legacy to Modern API

This document outlines the complete migration process from MCP SDK v0.6.0 (legacy) to v1.18.0+ (modern) for servers with tools and prompts.

## Problem Statement

**Issue**: Prompts implemented with legacy MCP SDK were not exposed as callable tools in Claude Code, despite working when tested directly via JSON-RPC.

**Root Cause**: Claude Code expects prompts to be registered using the modern `McpServer.registerPrompt()` API rather than manual `setRequestHandler()` approach.

## Migration Overview

### 1. Update Dependencies

```bash
# Update MCP SDK to latest version
npm update @modelcontextprotocol/sdk
```

**Before** (package.json):
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.6.0"
  }
}
```

**After** (package.json):
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.0"
  }
}
```

### 2. Update Imports

**Before**:
```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
```

**After**:
```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
```

### 3. Server Initialization

**Before**:
```javascript
const server = new Server(
  {
    name: 'your-mcp-server',
    version: '0.x.x',
  },
  {
    capabilities: {
      tools: {},
      // Missing prompts capability
    },
  }
);
```

**After**:
```javascript
const server = new McpServer(
  {
    name: 'your-mcp-server',
    version: '0.x.x',
  },
  {
    capabilities: {
      tools: {},
      prompts: {}, // Required for prompts to work
    },
  }
);
```

### 4. Tool Registration Migration

**Before** (Manual request handlers):
```javascript
// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'your_tool',
        description: 'Tool description',
        inputSchema: {
          type: 'object',
          properties: {
            param1: {
              type: 'string',
              description: 'Parameter description'
            }
          },
          required: ['param1']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'your_tool') {
    // Tool implementation
    return { content: [{ type: 'text', text: 'result' }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});
```

**After** (Modern tool registration):
```javascript
server.tool('your_tool', 'Tool description', {
  param1: z.string().describe('Parameter description'),
  param2: z.number().optional().min(1).max(100).default(10).describe('Optional numeric parameter')
}, async (args) => {
  // Tool implementation using args directly
  const { param1, param2 = 10 } = args;

  return {
    content: [
      {
        type: 'text',
        text: 'result'
      }
    ]
  };
});
```

### 5. Prompt Registration Migration

**Before** (Manual request handlers - often incomplete):
```javascript
// List prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'your_prompt',
        description: 'Prompt description',
        arguments: [
          {
            name: 'input_param',
            description: 'Input parameter',
            required: true
          }
        ]
      }
    ]
  };
});

// Handle prompt requests (often missing or incomplete)
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'your_prompt') {
    const { input_param } = args;
    const prompt = `Your prompt template with ${input_param}`;

    return {
      description: `Prompt for ${input_param}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});
```

**After** (Modern prompt registration):
```javascript
server.registerPrompt('your_prompt', {
  description: 'Prompt description',
  argsSchema: {
    input_param: z.string().describe('Input parameter'),
    optional_param: z.string().optional().describe('Optional parameter')
  }
}, async (args) => {
  const { input_param, optional_param } = args;
  const prompt = `Your prompt template with ${input_param}${optional_param ? ` and ${optional_param}` : ''}`;

  return {
    description: `Prompt for ${input_param}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});
```

## Key Benefits of Modern API

### 1. **Automatic Schema Validation**
- Zod schemas provide runtime type checking
- Better error messages for invalid parameters
- IntelliSense support in development

### 2. **Simplified Registration**
- Single method call registers both schema and handler
- No need for separate list/call handlers
- Reduced boilerplate code

### 3. **Better Claude Code Integration**
- Prompts are properly exposed as callable tools
- Consistent behavior across MCP clients
- Future-proof protocol compliance

### 4. **Enhanced Developer Experience**
- Type safety with Zod schemas
- Cleaner, more maintainable code
- Built-in parameter validation

## Common Zod Schema Patterns

```javascript
// String with validation
z.string().min(1).describe('Required string parameter')

// Optional string
z.string().optional().describe('Optional string parameter')

// Enum values
z.enum(['option1', 'option2', 'option3']).describe('Select from options')

// Number with constraints
z.number().min(1).max(100).default(10).describe('Number between 1-100')

// Boolean
z.boolean().default(false).describe('Boolean flag')

// Complex nested schema
z.object({
  nested_field: z.string().describe('Nested field')
}).optional().describe('Optional nested object')
```

## Testing the Migration

### 1. **Test Tool Functionality**
```bash
# Test via MCP client (if available)
mcp_client_tool your_tool '{"param1": "test"}'
```

### 2. **Test Prompt Listing**
```bash
# Test prompts are listed correctly
echo '{"jsonrpc": "2.0", "method": "prompts/list", "id": 1}' | node dist/index.js
```

### 3. **Test Prompt Execution**
```bash
# Test prompt execution
echo '{"jsonrpc": "2.0", "method": "prompts/get", "params": {"name": "your_prompt", "arguments": {"input_param": "test"}}, "id": 1}' | node dist/index.js
```

## Troubleshooting

### Issue: Prompts Not Visible in Claude Code
- **Cause**: Missing `prompts: {}` in capabilities
- **Solution**: Add prompts capability to server initialization

### Issue: Schema Validation Errors
- **Cause**: Incorrect Zod schema definitions
- **Solution**: Review Zod documentation and ensure schemas match expected parameters

### Issue: Build Errors
- **Cause**: Missing zod dependency or incorrect imports
- **Solution**: Zod is included with MCP SDK v1.18.0+, use correct imports

## Migration Checklist

- [ ] Update MCP SDK to v1.18.0+
- [ ] Update imports (`Server` → `McpServer`, add `z` from zod)
- [ ] Add `prompts: {}` to server capabilities
- [ ] Convert tool handlers to `server.tool()` registration
- [ ] Convert prompt handlers to `server.registerPrompt()` registration
- [ ] Replace JSON schemas with Zod schemas
- [ ] Test tool functionality
- [ ] Test prompt listing and execution
- [ ] Verify prompts are accessible in Claude Code
- [ ] Update version number and rebuild

## Files Typically Modified

1. **src/index.js** - Main server implementation
2. **package.json** - Update MCP SDK version
3. **dist/** - Rebuild after changes

This migration ensures your MCP server is compatible with modern MCP clients and properly exposes all tools and prompts as intended.