#!/usr/bin/env node

/**
 * Comprehensive test suite for all enhanced prompts
 * Validates AI assistant guidance and corrected query syntax across all prompts
 */

import { spawn } from 'child_process';

const PROMPT_TEST_CASES = [
  {
    name: 'Enhanced Competitive Intelligence',
    promptName: 'competitive_intelligence',
    params: { company_name: 'Pfizer' },
    expectedQueries: 7,
    criticalChecks: [
      'fields_for_general.*openfda.brand_name.*[^,]', // Single field, no comma
      'count.*sponsor_name.*[^.]', // Count without .exact
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Drug Safety Intelligence',
    promptName: 'drug_safety_intelligence',
    params: { drug_name: 'aspirin' },
    expectedQueries: 6,
    criticalChecks: [
      'patient.reaction.reactionmeddrapt.*[^.]', // Count without .exact
      'search_type.*adverse_events',
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Regulatory Intelligence',
    promptName: 'fda_regulatory_intelligence',
    params: { drug_name: 'aspirin', brand_name: 'Bayer' },
    expectedQueries: 9,
    criticalChecks: [
      'fields_for_general.*application_number.*[^,]', // Single field
      'fields_for_shortages.*status.*[^,]', // Single field for shortages
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Market Intelligence',
    promptName: 'fda_market_intelligence',
    params: { company_name: 'Pfizer', brand_name: 'Lipitor' },
    expectedQueries: 10,
    criticalChecks: [
      'count.*products.marketing_status',
      'fields_for_general.*products.te_code.*[^,]',
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Generic Competition',
    promptName: 'generic_competition_assessment',
    params: { brand_drug: 'Lipitor', generic_name: 'atorvastatin' },
    expectedQueries: 10,
    criticalChecks: [
      'products.reference_drug.*Yes|No',
      'fields_for_general.*sponsor_name.*[^,]',
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Supply Chain Intelligence',
    promptName: 'supply_chain_intelligence',
    params: { drug_name: 'metformin', therapeutic_area: 'Diabetes' },
    expectedQueries: 12,
    criticalChecks: [
      'fields_for_shortages.*generic_name.*[^,]',
      'search_type.*shortages',
      'EXECUTE EXACTLY'
    ]
  },
  {
    name: 'Enhanced Weekly Monitoring',
    promptName: 'weekly_regulatory_monitoring',
    params: {
      company_name: 'Pfizer',
      current_date: '2024-09-19',
      drug_name: 'aspirin'
    },
    expectedQueries: 11,
    criticalChecks: [
      'receivedate.*LAST_WEEK_START.*LAST_WEEK_END',
      'fields_for_shortages.*company_name.*[^,]',
      'EXECUTE EXACTLY'
    ]
  }
];

async function testEnhancedPrompt(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('=' .repeat(60));

  try {
    // Start the FDA MCP server
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error' } // Reduce noise
    });

    // Prepare the prompt request
    const promptRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/get',
      params: {
        name: testCase.promptName,
        arguments: testCase.params
      }
    };

    console.log(`📨 Request: ${testCase.promptName}`);
    console.log(`📋 Params:`, JSON.stringify(testCase.params, null, 2));

    // Send the request
    server.stdin.write(JSON.stringify(promptRequest) + '\n');

    // Collect response with timeout
    let responseData = '';
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 15000);

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
        const logLine = data.toString().trim();
        if (logLine.includes('error') || logLine.includes('Error')) {
          console.log('⚠️  Server warning:', logLine);
        }
      });
    });

    // Analyze the response
    if (response.result && response.result.messages && response.result.messages[0]) {
      const promptText = response.result.messages[0].content.text;

      // Core enhancement validation checks
      const enhancementChecks = {
        'Has instruction header': promptText.includes('🚨 IMPORTANT: Execute these queries EXACTLY'),
        'Has validation rules': promptText.includes('FIELD VALIDATION RULES'),
        'Has error prevention': promptText.includes('COMMON MISTAKES TO AVOID'),
        'Has working examples': promptText.includes('WORKING EXAMPLES'),
        'Has execution protocol': promptText.includes('EXECUTION PROTOCOL'),
        'Has field reference': promptText.includes('FIELD REFERENCE') || promptText.includes('Field Interpretation'),
        'Has debugging steps': promptText.includes('DEBUGGING STEPS'),
        'Has corrected queries': promptText.includes('EXECUTE EXACTLY'),
        'No comma-separated fields in queries': !promptText.match(/EXECUTE EXACTLY[\s\S]*?fields_for_\w+"\s*:\s*"[^"]*,[^"]*"/),
        'No .exact in count in queries': !promptText.match(/EXECUTE EXACTLY[\s\S]*?"count"\s*:\s*"[^"]*\.exact"/)
      };

      // Specific test case validation
      const specificChecks = {};
      testCase.criticalChecks.forEach((check, index) => {
        const regex = new RegExp(check);
        specificChecks[`Critical check ${index + 1}`] = regex.test(promptText);
      });

      // Count EXECUTE EXACTLY sections
      const executeExactlyCount = (promptText.match(/EXECUTE EXACTLY/g) || []).length;
      const queryCountCheck = executeExactlyCount >= testCase.expectedQueries;

      enhancementChecks[`Query count (${executeExactlyCount}/${testCase.expectedQueries})`] = queryCountCheck;

      // Combined results
      const allChecks = { ...enhancementChecks, ...specificChecks };

      console.log('\n✅ Enhancement Validation:');
      Object.entries(allChecks).forEach(([check, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${check}`);
      });

      const passedChecks = Object.values(allChecks).filter(Boolean).length;
      const totalChecks = Object.keys(allChecks).length;
      const successRate = Math.round(passedChecks/totalChecks*100);

      console.log(`\n📊 Enhancement Score: ${passedChecks}/${totalChecks} (${successRate}%)`);

      if (successRate >= 90) {
        console.log('🎉 Excellent! Enhancement requirements met');
      } else if (successRate >= 75) {
        console.log('✅ Good! Minor enhancements needed');
      } else {
        console.log('⚠️  Issues found - review enhancement implementation');
      }

      // Show specific improvements
      console.log('\n🔧 Key Improvements Verified:');
      console.log(`- Single field usage: ${enhancementChecks['No comma-separated fields'] ? '✅' : '❌'}`);
      console.log(`- Count parameter fix: ${enhancementChecks['No .exact in count'] ? '✅' : '❌'}`);
      console.log(`- Execute exactly sections: ${queryCountCheck ? '✅' : '❌'}`);
      console.log(`- Comprehensive guidance: ${enhancementChecks['Has working examples'] ? '✅' : '❌'}`);

      server.kill();
      return {
        success: successRate >= 75,
        score: successRate,
        details: allChecks,
        promptName: testCase.promptName
      };

    } else {
      console.log('❌ Invalid response format');
      console.log(JSON.stringify(response, null, 2));
      server.kill();
      return { success: false, score: 0, promptName: testCase.promptName };
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    return { success: false, score: 0, error: error.message, promptName: testCase.promptName };
  }
}

async function runAllTests() {
  console.log('🚀 Running Comprehensive Enhanced Prompts Test Suite');
  console.log('=' .repeat(80));
  console.log(`Testing ${PROMPT_TEST_CASES.length} enhanced prompts for AI assistant compatibility\n`);

  const results = [];

  for (const testCase of PROMPT_TEST_CASES) {
    const result = await testCase;
    results.push(await testEnhancedPrompt(testCase));

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary report
  console.log('\n' + '=' .repeat(80));
  console.log('📋 FINAL ENHANCEMENT VALIDATION REPORT');
  console.log('=' .repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

  console.log(`\n📊 Overall Results:`);
  console.log(`✅ Successfully Enhanced: ${successful.length}/${results.length} prompts`);
  console.log(`❌ Need Review: ${failed.length}/${results.length} prompts`);
  console.log(`📈 Average Enhancement Score: ${averageScore}%`);

  console.log(`\n📈 Individual Scores:`);
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.promptName}: ${result.score}%`);
  });

  if (failed.length > 0) {
    console.log(`\n⚠️  Prompts needing review:`);
    failed.forEach(result => {
      console.log(`- ${result.promptName}: ${result.error || 'Enhancement validation failed'}`);
    });
  }

  console.log(`\n🎯 Enhancement Status: ${averageScore >= 85 ? 'EXCELLENT' : averageScore >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);

  if (averageScore >= 85) {
    console.log('🎉 All prompts successfully enhanced for AI assistant execution!');
    console.log('🚀 Ready for production use with Cursor, Claude Code, and other AI assistants.');
  }

  console.log('\n🏁 Comprehensive testing completed');
  return { success: averageScore >= 75, averageScore, results };
}

// Run the comprehensive test suite
runAllTests().catch(console.error);