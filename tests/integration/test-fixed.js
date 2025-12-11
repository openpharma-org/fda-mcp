#!/usr/bin/env node

import { spawn } from 'child_process';

async function testFixed() {
  console.log('🧪 Testing fixed search queries...\n');

  const tests = [
    {
      name: 'aspirin search',
      params: {
        method: "lookup_drug",
        search_term: "aspirin",
        search_type: "general",
        limit: 2
      }
    },
    {
      name: 'PFIZER search',
      params: {
        method: "lookup_drug",
        search_term: "PFIZER",
        search_type: "general",
        limit: 2
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n🔍 Testing ${test.name}...`);

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
      id: test.name.replace(' ', '_'),
      method: "tools/call",
      params: {
        name: "fda_info",
        arguments: test.params
      }
    };

    server.stdin.write(JSON.stringify(toolCallRequest) + '\n');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));

    server.kill();

    // Parse response
    const lines = responseData.trim().split('\n');
    let found = false;

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === test.name.replace(' ', '_')) {
            if (parsed.result?.content?.[0]?.text) {
              const toolResult = JSON.parse(parsed.result.content[0].text);
              console.log(`  ✅ Success: ${toolResult.success}`);
              console.log(`  📊 Total results: ${toolResult.data?.total_results || 'N/A'}`);

              if (toolResult.data?.results && toolResult.data.results.length > 0) {
                console.log(`  🏢 Sample sponsor: ${toolResult.data.results[0].sponsor_name || 'N/A'}`);
                console.log(`  💊 Sample product: ${toolResult.data.results[0].products?.[0]?.brand_name || toolResult.data.results[0].products?.[0]?.generic_name || 'N/A'}`);
              }

              if (toolResult.error) {
                console.log(`  ❌ Error: ${toolResult.error}`);
              }
              found = true;
            }
          }
        } catch (e) {
          // Skip
        }
      }
    });

    if (!found) {
      console.log(`  ❌ No response found for ${test.name}`);
    }
  }

  console.log('\n✅ Testing complete');
}

testFixed().catch(console.error);