#!/usr/bin/env node

/**
 * Test enhanced competitive intelligence prompt
 * Validates AI assistant guidance and corrected query syntax
 */

import { spawn } from 'child_process';

async function testEnhancedPrompt() {
  console.log('🧪 Testing Enhanced Competitive Intelligence Prompt');
  console.log('=' .repeat(60));

  const testCases = [
    {
      name: 'Enhanced Competitive Intelligence for Lilly',
      description: 'Test the enhanced prompt with proper guidance and corrected queries',
      company: 'Lilly'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`🏢 Company: ${test.company}`);

    try {
      // Start the FDA MCP server
      const server = spawn('node', ['build/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, LOG_LEVEL: 'info' }
      });

      // Prepare the prompt request
      const promptRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: {
          name: 'competitive_intelligence',
          arguments: {
            company_name: test.company
          }
        }
      };

      console.log('\n📨 Sending prompt request...');
      console.log(JSON.stringify(promptRequest, null, 2));

      // Send the request
      server.stdin.write(JSON.stringify(promptRequest) + '\n');

      // Collect response
      let responseData = '';

      const responsePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 10000);

        server.stdout.on('data', (data) => {
          responseData += data.toString();
          try {
            const response = JSON.parse(responseData);
            clearTimeout(timeout);
            resolve(response);
          } catch (e) {
            // Continue collecting data
          }
        });

        server.stderr.on('data', (data) => {
          console.log('📢 Server log:', data.toString().trim());
        });
      });

      const response = await responsePromise;

      console.log('\n📨 Response received:');
      if (response.result && response.result.messages && response.result.messages[0]) {
        const promptText = response.result.messages[0].content.text;

        // Check for key enhancement elements
        const checks = {
          'Has instruction header': promptText.includes('🚨 IMPORTANT: Execute these queries EXACTLY'),
          'Has validation rules': promptText.includes('FIELD VALIDATION RULES'),
          'Has error prevention': promptText.includes('COMMON MISTAKES TO AVOID'),
          'Has working examples': promptText.includes('WORKING EXAMPLES'),
          'Has execution protocol': promptText.includes('EXECUTION PROTOCOL'),
          'Has field reference': promptText.includes('FIELD REFERENCE'),
          'Has debugging steps': promptText.includes('DEBUGGING STEPS'),
          'Has corrected queries': promptText.includes('EXECUTE EXACTLY'),
          'Single field usage': !promptText.includes('fields_for_general": "openfda.brand_name,openfda.generic_name"'),
          'Proper escaping': promptText.includes('sponsor_name:\\"')
        };

        console.log('\n✅ Enhancement Validation:');
        Object.entries(checks).forEach(([check, passed]) => {
          console.log(`${passed ? '✅' : '❌'} ${check}`);
        });

        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        console.log(`\n📊 Enhancement Score: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);

        if (passedChecks === totalChecks) {
          console.log('🎉 All enhancement requirements met!');
        } else {
          console.log('⚠️  Some enhancements missing or incorrect');
        }

        // Show a sample of the enhanced prompt
        console.log('\n📄 Sample Enhanced Prompt Content:');
        console.log('=' .repeat(50));
        console.log(promptText.substring(0, 1000) + '...\n');

      } else {
        console.log('❌ Invalid response format');
        console.log(JSON.stringify(response, null, 2));
      }

      // Cleanup
      server.kill();

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🏁 Enhanced prompt testing completed');
}

// Run the test
testEnhancedPrompt().catch(console.error);