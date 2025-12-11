#!/usr/bin/env node

import { spawn } from 'child_process';

async function testDetailed() {
  console.log('🧪 Testing with detailed results...\n');

  const server = spawn('node', ['dist/index.js'], {
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
    id: "detailed_test",
    method: "tools/call",
    params: {
      name: "fda_info",
      arguments: {
        method: "lookup_drug",
        search_term: "aspirin",
        search_type: "general",
        limit: 2
      }
    }
  };

  console.log('📤 Testing aspirin with detailed output...');
  server.stdin.write(JSON.stringify(toolCallRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 5000));

  server.kill();

  console.log('\n📥 Detailed Results:');
  const lines = responseData.trim().split('\n');

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === "detailed_test") {
          if (parsed.result?.content?.[0]?.text) {
            const toolResult = JSON.parse(parsed.result.content[0].text);
            console.log(`\n🔍 Full toolResult structure:`);
            console.log(JSON.stringify(toolResult, null, 2).substring(0, 1000));
            console.log(`\n✅ Success: ${toolResult.success}`);
            console.log(`📊 Total results: ${toolResult.data.total_results}`);
            console.log(`🔍 Query: ${toolResult.data.query}`);
            console.log(`📋 Search type: ${toolResult.data.search_type}`);

            if (toolResult.data.results && toolResult.data.results.length > 0) {
              console.log(`\n📦 Found ${toolResult.data.results.length} results:`);
              toolResult.data.results.forEach((result, index) => {
                console.log(`\n  Result ${index + 1}:`);
                console.log(`    Application: ${result.application_number}`);
                console.log(`    Sponsor: ${result.sponsor_name}`);
                if (result.products && result.products[0]) {
                  const product = result.products[0];
                  console.log(`    Product: ${product.brand_name || product.generic_name || 'N/A'}`);
                  if (product.active_ingredients && product.active_ingredients[0]) {
                    console.log(`    Active ingredient: ${product.active_ingredients[0].name}`);
                  }
                }
              });
            }

            if (toolResult.error) {
              console.log(`❌ Error: ${toolResult.error}`);
            }
          }
        }
      } catch (e) {
        // Skip
      }
    }
  });

  console.log('\n✅ Test completed');
}

testDetailed().catch(console.error);