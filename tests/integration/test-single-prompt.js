#!/usr/bin/env node

/**
 * Test single enhanced prompt for debugging
 */

import { spawn } from 'child_process';

async function testSinglePrompt() {
  console.log('🧪 Testing Single Enhanced Prompt: competitive_intelligence');

  try {
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error' }
    });

    const promptRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/get',
      params: {
        name: 'competitive_intelligence',
        arguments: { company_name: 'Pfizer' }
      }
    };

    server.stdin.write(JSON.stringify(promptRequest) + '\n');

    let responseData = '';
    const response = await new Promise((resolve, reject) => {
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
    });

    if (response.result && response.result.messages && response.result.messages[0]) {
      const promptText = response.result.messages[0].content.text;

      console.log('\n📄 Sample of Enhanced Prompt:');
      console.log('=' .repeat(50));
      console.log(promptText.substring(0, 1500) + '...\n');

      // Check for corrected patterns
      console.log('🔍 Field Validation Checks:');

      // Look for any comma-separated fields
      const commaFieldPattern = /fields_for_\w+"\s*:\s*"[^"]*,[^"]*"/g;
      const commaMatches = promptText.match(commaFieldPattern);
      console.log(`- Comma-separated fields: ${commaMatches ? '❌ Found: ' + commaMatches.join(', ') : '✅ None found'}`);

      // Look for .exact in count
      const exactCountPattern = /"count"\s*:\s*"[^"]*\.exact"/g;
      const exactMatches = promptText.match(exactCountPattern);
      console.log(`- .exact in count: ${exactMatches ? '❌ Found: ' + exactMatches.join(', ') : '✅ None found'}`);

      // Count EXECUTE EXACTLY sections
      const executeCount = (promptText.match(/EXECUTE EXACTLY/g) || []).length;
      console.log(`- EXECUTE EXACTLY sections: ${executeCount}`);

      // Check for single fields in examples
      console.log('\n🔍 Enhanced Guidance Elements:');
      console.log(`- Instruction header: ${promptText.includes('🚨 IMPORTANT') ? '✅' : '❌'}`);
      console.log(`- Validation rules: ${promptText.includes('FIELD VALIDATION RULES') ? '✅' : '❌'}`);
      console.log(`- Error prevention: ${promptText.includes('COMMON MISTAKES') ? '✅' : '❌'}`);
      console.log(`- Working examples: ${promptText.includes('WORKING EXAMPLES') ? '✅' : '❌'}`);

    } else {
      console.log('❌ Invalid response:', response);
    }

    server.kill();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSinglePrompt().catch(console.error);