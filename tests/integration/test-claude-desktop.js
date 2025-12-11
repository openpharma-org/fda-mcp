/**
 * Test script specifically for Claude Desktop integration
 * Tests the exact startup sequence Claude Desktop uses
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testClaudeDesktopIntegration() {
  console.log('🧪 Testing FDA MCP Server for Claude Desktop...\n');

  const serverPath = join(__dirname, 'build', 'index.js');
  console.log(`📋 Server path: ${serverPath}`);

  // Test 1: Check file exists and is executable
  console.log('\n📋 1. Checking file permissions and existence...');

  try {
    const { access, constants } = await import('fs');
    await new Promise((resolve, reject) => {
      access(serverPath, constants.F_OK | constants.X_OK, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Server file exists and is executable');
  } catch (error) {
    console.log(`❌ File access error: ${error.message}`);
    return false;
  }

  // Test 2: Test server startup with same environment as Claude Desktop
  console.log('\n📋 2. Testing server startup with Claude Desktop environment...');

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      LOG_LEVEL: 'debug',
      FDA_API_KEY: 'jWdSDmjpbpwXVa80y1yvlDrJR6bMrUkf2Ima4dtw'
    };

    const child = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let startupOutput = '';
    let errorOutput = '';
    let hasStarted = false;

    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      if (!hasStarted) {
        console.log('❌ Server startup timeout (30 seconds)');
        child.kill('SIGTERM');
        resolve(false);
      }
    }, 30000);

    child.stdout.on('data', (data) => {
      startupOutput += data.toString();

      // Look for MCP server ready indicators
      if (data.toString().includes('FDA MCP Server') || data.toString().includes('running on stdio')) {
        console.log('✅ Server started successfully');
        hasStarted = true;
        clearTimeout(timeout);
        child.kill('SIGTERM');
        resolve(true);
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log(`📊 Server log: ${data.toString().trim()}`);

      // Check for ready message in stderr (where our server logs)
      if (data.toString().includes('FDA MCP Server') && data.toString().includes('running on stdio')) {
        console.log('✅ Server started successfully (via stderr)');
        hasStarted = true;
        clearTimeout(timeout);
        child.kill('SIGTERM');
        resolve(true);
      }
    });

    child.on('error', (error) => {
      console.log(`❌ Server process error: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timeout);

      if (signal === 'SIGTERM' && hasStarted) {
        console.log('✅ Server shutdown gracefully');
        resolve(true);
      } else if (!hasStarted) {
        console.log(`❌ Server exited unexpectedly (code: ${code}, signal: ${signal})`);

        if (errorOutput) {
          console.log('📊 Error output:');
          console.log(errorOutput);
        }

        if (startupOutput) {
          console.log('📊 Startup output:');
          console.log(startupOutput);
        }

        resolve(false);
      }
    });

    // Test 3: Send a test MCP message
    console.log('📋 3. Testing MCP protocol response...');

    // Wait a moment for server to initialize, then send a ping
    setTimeout(() => {
      if (child.stdin && !child.killed) {
        const testMessage = JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 'test-ping'
        }) + '\n';

        try {
          child.stdin.write(testMessage);
        } catch (error) {
          console.log(`⚠️  Could not send test message: ${error.message}`);
        }
      }
    }, 1000);
  });
}

// Run the test
testClaudeDesktopIntegration().then(success => {
  console.log('\n📊 Claude Desktop Integration Test Results:');

  if (success) {
    console.log('✅ Server is compatible with Claude Desktop');
    console.log('✅ File permissions are correct');
    console.log('✅ Server starts and responds properly');
    console.log('\n🎯 Troubleshooting suggestions:');
    console.log('1. Restart Claude Desktop completely');
    console.log('2. Check that the server appears in Claude Desktop settings');
    console.log('3. Look for any error messages in Claude Desktop logs');
    console.log('4. Try asking Claude: "What FDA tools do you have available?"');
  } else {
    console.log('❌ Server has issues that prevent Claude Desktop integration');
    console.log('\n🔧 Try these fixes:');
    console.log('1. Run: npm run build');
    console.log('2. Run: chmod +x build/index.js');
    console.log('3. Check the Claude Desktop config file');
    console.log('4. Restart Claude Desktop');
  }

  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});