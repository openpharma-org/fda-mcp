# FDA MCP Server - Troubleshooting Guide

This guide helps resolve common issues when using the FDA MCP Server with Claude.

## "Could not attach to fda-mcp-server" Error

### Common Causes and Solutions

#### 1. **Incorrect File Path in .mcp.json**
**Problem**: The most common cause is the `.mcp.json` file pointing to the wrong path.

**Solution**: Update your `.mcp.json` file to point to the correct build output:

```json
{
  "mcpServers": {
    "fda-mcp-server": {
      "command": "node",
      "args": ["/Users/joan.saez-pons/code/fda-mcp-server/build/index.js"],
      "env": {
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Important**: The path should point to `build/index.js`, not `dist/index.js`.

#### 2. **Server Not Built**
**Problem**: The TypeScript source hasn't been compiled to JavaScript.

**Solution**: Build the server before using it:
```bash
cd /Users/joan.saez-pons/code/fda-mcp-server
npm run build
```

#### 3. **Missing Executable Permissions**
**Problem**: The built file doesn't have execute permissions.

**Solution**: Make the file executable:
```bash
chmod +x /Users/joan.saez-pons/code/fda-mcp-server/build/index.js
```

#### 4. **Missing Dependencies**
**Problem**: Node modules are not installed.

**Solution**: Install dependencies:
```bash
cd /Users/joan.saez-pons/code/fda-mcp-server
npm install
```

#### 5. **Node.js Version Compatibility**
**Problem**: Incompatible Node.js version.

**Solution**: Ensure you're using Node.js 18+ :
```bash
node --version  # Should be v18.0.0 or higher
```

#### 6. **Environment Variables**
**Problem**: Missing or incorrect environment variables.

**Solution**: Check your `.mcp.json` includes required environment variables:
```json
{
  "mcpServers": {
    "fda-mcp-server": {
      "command": "node",
      "args": ["/Users/joan.saez-pons/code/fda-mcp-server/build/index.js"],
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Testing Server Startup

To verify the server starts correctly, run the startup test:

```bash
cd /Users/joan.saez-pons/code/fda-mcp-server
node test-startup.js
```

Expected output:
```
🧪 Testing FDA MCP Server startup...
✅ Server initialized successfully
🟢 Server ready: YES
🎉 Server startup test completed successfully!
```

## Debugging Steps

### 1. Check File Existence
```bash
ls -la /Users/joan.saez-pons/code/fda-mcp-server/build/index.js
```

Should show:
```
-rwxr-xr-x@ 1 user staff 2623 [date] build/index.js
```

### 2. Test Manual Execution
```bash
cd /Users/joan.saez-pons/code/fda-mcp-server
node build/index.js
```

Should start the server (will wait for stdio input - press Ctrl+C to exit).

### 3. Check Build Output
```bash
cd /Users/joan.saez-pons/code/fda-mcp-server
npm run build
```

Should complete without errors and show:
```
✅ Post-build script completed successfully
```

### 4. Verify MCP Configuration
Check your `.mcp.json` file location:
- **Claude Desktop**: Usually in `~/.config/claude-desktop/` or `~/Library/Application Support/Claude/`
- **Claude Code**: Usually in the workspace or project root

### 5. Check Logs
If Claude shows connection errors, check:
1. Claude's error logs (usually in the application)
2. System console logs
3. Run with `LOG_LEVEL=debug` for detailed output

## Common Error Messages

### "Module not found"
**Cause**: Missing dependencies or incorrect import paths.
**Solution**: Run `npm install` and `npm run build`.

### "Permission denied"
**Cause**: File not executable.
**Solution**: Run `chmod +x build/index.js`.

### "Cannot find module '@modelcontextprotocol/sdk'"
**Cause**: Dependencies not installed.
**Solution**: Run `npm install`.

### "Syntax error: Unexpected token"
**Cause**: Running TypeScript source instead of compiled JavaScript.
**Solution**: Run `npm run build` and point to `build/index.js`.

## Advanced Troubleshooting

### Enable Debug Logging
Add to your `.mcp.json`:
```json
{
  "env": {
    "LOG_LEVEL": "debug",
    "NODE_ENV": "development"
  }
}
```

### Test Individual Components
```bash
# Test API connectivity
node test-debug.js

# Test request deduplication
node test-deduplication.js

# Test MCP compliance
node test-mcp-compliance.js

# Test schema validation
node test-mcp-schema.js
```

### Verify Server Health
```bash
# Quick health check
echo '{"jsonrpc":"2.0","method":"ping","id":"1"}' | node build/index.js
```

## Claude-Specific Issues

### Claude Desktop Configuration
Ensure your `.mcp.json` is in the correct location:
- **macOS**: `~/Library/Application Support/Claude/mcp_servers.json`
- **Windows**: `%APPDATA%\Claude\mcp_servers.json`
- **Linux**: `~/.config/claude/mcp_servers.json`

### Claude Code Configuration
The `.mcp.json` file should be in your project root directory.

### Restart Claude
After making configuration changes:
1. Save all files
2. Restart Claude completely
3. Check that the server appears in Claude's MCP server list

## Getting Help

If you're still experiencing issues:

1. **Check the startup test**: Run `node test-startup.js`
2. **Verify the build**: Run `npm run build`
3. **Check permissions**: Run `ls -la build/index.js`
4. **Test manually**: Run `node build/index.js` and verify it starts
5. **Review logs**: Check Claude's error messages and console output

## Success Indicators

When working correctly, you should see:
- ✅ FDA MCP Server appears in Claude's available tools
- ✅ You can ask Claude to "Search for information about aspirin using the FDA database"
- ✅ Claude can access drug information, adverse events, and regulatory data
- ✅ Progress tracking and cancellation work properly

The server supports comprehensive FDA drug and device information lookup with full MCP 2025-06-18 specification compliance.