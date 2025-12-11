#!/usr/bin/env node

import { spawn } from 'child_process';

async function testComplexQueries() {
  console.log('🧪 Testing complex query parsing functionality...\n');

  const complexQueries = [
    {
      name: 'Complex field search',
      query: 'sponsor_name:"PFIZER" AND products.dosage_form:"TABLET"'
    },
    {
      name: 'Date range query',
      query: 'receivedate:[20240101+TO+20241231]'
    },
    {
      name: 'Field existence query',
      field_exists: 'patient.reaction.reactionmeddrapt'
    },
    {
      name: 'Field validation test',
      search_term: 'aspirin',
      fields_for_general: 'sponsor_name'
    },
    {
      name: 'Invalid field test',
      search_term: 'aspirin',
      fields_for_general: 'invalid_field_name'
    }
  ];

  for (const test of complexQueries) {
    console.log(`🔍 Testing: ${test.name}`);

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
      id: test.name.replace(/\s+/g, '_'),
      method: "tools/call",
      params: {
        name: "fda_info",
        arguments: {
          method: "lookup_drug",
          search_term: test.query || test.search_term || "aspirin",
          search_type: test.search_type || "general",
          limit: 1,
          ...(test.field_exists && { field_exists: test.field_exists }),
          ...(test.fields_for_general && { fields_for_general: test.fields_for_general })
        }
      }
    };

    server.stdin.write(JSON.stringify(toolCallRequest) + '\n');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    server.kill();

    // Parse response
    const lines = responseData.trim().split('\n');
    let found = false;

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === test.name.replace(/\s+/g, '_')) {
            if (parsed.result?.content?.[0]?.text) {
              const toolResult = JSON.parse(parsed.result.content[0].text);
              if (toolResult.success) {
                console.log(`  ✅ Success: ${toolResult.data?.total_results || 'N/A'} results`);
              } else {
                console.log(`  ❌ Error: ${toolResult.error || 'Unknown error'}`);
              }
              found = true;
            }
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    });

    if (!found) {
      console.log(`  ❓ No response found`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ Complex query testing completed');
}

testComplexQueries().catch(console.error);