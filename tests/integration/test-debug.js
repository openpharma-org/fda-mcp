#!/usr/bin/env node

import { spawn } from 'child_process';

async function testDebug() {
  console.log('🧪 Testing with debug output to see URLs...\n');

  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, LOG_LEVEL: 'debug' }
  });

  let responseData = '';
  let errorData = '';

  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1500));

  const toolCallRequest = {
    jsonrpc: "2.0",
    id: "debug_test",
    method: "tools/call",
    params: {
      name: "fda_info",
      arguments: {
        method: "lookup_drug",
        search_term: "aspirin",
        search_type: "general",
        limit: 1
      }
    }
  };

  console.log('📤 Sending request...');
  server.stdin.write(JSON.stringify(toolCallRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  server.kill();

  console.log('\n📋 Debug Output:');
  const lines = responseData.trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.level === 'debug' && parsed.message) {
          console.log(`🔍 ${parsed.message}`);
        }
        if (parsed.level === 'error') {
          console.log(`❌ Error: ${parsed.message}`);
          if (parsed.error?.details) {
            console.log(`   Details: ${JSON.stringify(parsed.error.details, null, 2)}`);
          }
        }
      } catch (e) {
        // Skip non-JSON lines
      }
    }
  });

  if (errorData) {
    console.log('\n📋 Stderr:', errorData);
  }

  console.log('\n✅ Debug test completed');
}

testDebug().catch(console.error);