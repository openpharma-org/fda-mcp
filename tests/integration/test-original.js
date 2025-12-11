#!/usr/bin/env node

import { spawn } from 'child_process';

async function testOriginal() {
  console.log('🧪 Testing original server with aspirin...\n');

  const server = spawn('node', ['src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseData = '';

  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1500));

  const toolCallRequest = {
    jsonrpc: "2.0",
    id: "original_test",
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

  console.log('📤 Sending request to original server...');
  server.stdin.write(JSON.stringify(toolCallRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  server.kill();

  console.log('\n📥 Original server response:');
  const lines = responseData.trim().split('\n');

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === "original_test") {
          if (parsed.result?.content?.[0]?.text) {
            const toolResult = JSON.parse(parsed.result.content[0].text);
            console.log(`Success: ${toolResult.success}`);
            console.log(`Total results: ${toolResult.total_results || 'N/A'}`);

            if (toolResult.results && toolResult.results.length > 0) {
              console.log('Sample result:');
              console.log(JSON.stringify(toolResult.results[0], null, 2));
            }

            if (toolResult.error) {
              console.log(`Error: ${toolResult.error}`);
            }
          }
        }
      } catch (e) {
        // Skip
      }
    }
  });

  console.log('\n✅ Original test completed');
}

testOriginal().catch(console.error);