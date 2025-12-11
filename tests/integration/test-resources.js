/**
 * Test script for MCP resource functionality
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testResources() {
  console.log('🧪 Testing FDA MCP Server Resource Handlers...\n');

  const serverPath = join(__dirname, 'build', 'index.js');

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      LOG_LEVEL: 'debug'
    };

    const child = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responses = [];

    child.stderr.on('data', (data) => {
      const output = data.toString();
      // Only log server ready message
      if (output.includes('FDA MCP Server ready')) {
        console.log('✅ Server started successfully');

        // Test 1: List resources
        console.log('\n📋 1. Testing resources/list...');
        const listRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/list',
          id: 'test-list-resources'
        }) + '\n';

        child.stdin.write(listRequest);
      }
    });

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        try {
          const response = JSON.parse(output);
          responses.push(response);

          console.log(`📤 Response: ${JSON.stringify(response, null, 2)}`);

          // If we got the list response, test reading a resource
          if (response.id === 'test-list-resources') {
            if (response.result && response.result.resources && response.result.resources.length > 0) {
              console.log('✅ Resources list successful');

              // Test 2: Read a specific resource
              console.log('\n📋 2. Testing resources/read...');
              const readRequest = JSON.stringify({
                jsonrpc: '2.0',
                method: 'resources/read',
                params: {
                  uri: response.result.resources[0].uri
                },
                id: 'test-read-resource'
              }) + '\n';

              child.stdin.write(readRequest);
            } else {
              console.log('❌ No resources found in list response');
              child.kill('SIGTERM');
              resolve(false);
            }
          } else if (response.id === 'test-read-resource') {
            if (response.result && response.result.contents && response.result.contents.length > 0) {
              const content = response.result.contents[0];
              console.log('✅ Resource read successful');
              console.log(`📊 Content preview: ${content.text ? content.text.substring(0, 100) + '...' : 'Binary content'}`);
              child.kill('SIGTERM');
              resolve(true);
            } else {
              console.log('❌ Resource read failed');
              child.kill('SIGTERM');
              resolve(false);
            }
          }
        } catch (error) {
          console.log(`⚠️  Could not parse response: ${output}`);
        }
      }
    });

    child.on('error', (error) => {
      console.log(`❌ Server process error: ${error.message}`);
      resolve(false);
    });

    child.on('exit', (code, signal) => {
      if (signal === 'SIGTERM') {
        console.log('\n✅ Test completed');
      } else {
        console.log(`❌ Server exited unexpectedly (code: ${code}, signal: ${signal})`);
        resolve(false);
      }
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.log('❌ Test timeout');
      child.kill('SIGTERM');
      resolve(false);
    }, 15000);
  });
}

// Run the test
testResources().then(success => {
  console.log('\n📊 Resource Test Results:');

  if (success) {
    console.log('✅ Resource handlers are working correctly');
    console.log('✅ resources/list returns registered resources');
    console.log('✅ resources/read returns resource content');
  } else {
    console.log('❌ Resource handlers have issues');
    console.log('🔧 Check the server implementation and request handling');
  }

  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});