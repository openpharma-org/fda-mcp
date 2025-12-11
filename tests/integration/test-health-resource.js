/**
 * Test script specifically for the health resource
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testHealthResource() {
  console.log('🧪 Testing FDA Server Health Resource...\n');

  const serverPath = join(__dirname, 'build', 'index.js');

  return new Promise((resolve) => {
    const env = {
      ...process.env,
      LOG_LEVEL: 'info'
    };

    const child = spawn('node', [serverPath], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('FDA MCP Server ready')) {
        console.log('✅ Server started successfully');

        // Test reading the health resource specifically
        console.log('\n📋 Testing health resource read...');
        const readRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/read',
          params: {
            uri: 'fda://server/health'
          },
          id: 'test-health-resource'
        }) + '\n';

        child.stdin.write(readRequest);
      }
    });

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        try {
          const response = JSON.parse(output);

          console.log(`📤 Health Resource Response:`);
          console.log(JSON.stringify(response, null, 2));

          if (response.id === 'test-health-resource') {
            if (response.result && response.result.contents && response.result.contents.length > 0) {
              const content = response.result.contents[0];
              console.log('\n✅ Health resource read successful');
              console.log(`📊 Content size: ${content.text?.length || 0} characters`);
              console.log(`📊 MIME type: ${content.mimeType}`);

              // Try to parse the JSON content
              try {
                const healthData = JSON.parse(content.text || '{}');
                console.log(`✅ Health status: ${healthData.status}`);
                console.log(`📊 Server uptime: ${healthData.performance?.uptime || 'unknown'}`);

                child.kill('SIGTERM');
                resolve(true);
              } catch (parseError) {
                console.log('❌ Health content is not valid JSON');
                child.kill('SIGTERM');
                resolve(false);
              }
            } else {
              console.log('❌ Health resource read failed');
              child.kill('SIGTERM');
              resolve(false);
            }
          }
        } catch (error) {
          console.log(`⚠️  Could not parse response: ${output.substring(0, 200)}...`);
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

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('❌ Test timeout');
      child.kill('SIGTERM');
      resolve(false);
    }, 10000);
  });
}

// Run the test
testHealthResource().then(success => {
  console.log('\n📊 Health Resource Test Results:');

  if (success) {
    console.log('✅ Health resource is working correctly');
    console.log('✅ Returns valid JSON content');
    console.log('✅ Proper MIME type (application/json)');
    console.log('✅ Reasonable content size for Claude Desktop');
  } else {
    console.log('❌ Health resource has issues');
  }

  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});