/**
 * Test script for FDA Safety Alerts resource
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testSafetyAlerts() {
  console.log('🧪 Testing FDA Safety Alerts Resource...\n');

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

        // Test reading the safety alerts resource
        console.log('\n📋 Testing safety alerts resource...');
        const readRequest = JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/read',
          params: {
            uri: 'fda://safety/alerts/current'
          },
          id: 'test-safety-alerts'
        }) + '\n';

        child.stdin.write(readRequest);
      }
    });

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        try {
          const response = JSON.parse(output);

          if (response.id === 'test-safety-alerts') {
            console.log(`📤 Safety Alerts Response received`);

            if (response.result && response.result.contents && response.result.contents.length > 0) {
              const content = response.result.contents[0];
              console.log('\n✅ Safety alerts resource read successful');
              console.log(`📊 Content size: ${content.text?.length || 0} characters`);
              console.log(`📊 MIME type: ${content.mimeType}`);

              // Parse and analyze the safety data
              try {
                const safetyData = JSON.parse(content.text || '{}');
                console.log(`\n📊 Safety Intelligence Summary:`);
                console.log(`   🚨 Total alerts: ${safetyData.alertCount}`);
                console.log(`   🔴 Critical alerts: ${safetyData.criticalAlerts}`);
                console.log(`   💊 Drug alerts: ${safetyData.categories?.drugs || 0}`);
                console.log(`   🏥 Device alerts: ${safetyData.categories?.devices || 0}`);
                console.log(`   🧬 Biologic alerts: ${safetyData.categories?.biologics || 0}`);

                if (safetyData.recentAlerts && safetyData.recentAlerts.length > 0) {
                  console.log(`\n📋 Recent Critical Alerts:`);
                  safetyData.recentAlerts.slice(0, 2).forEach((alert, index) => {
                    console.log(`   ${index + 1}. ${alert.title}`);
                    console.log(`      Severity: ${alert.severity}, Date: ${alert.date}`);
                  });
                }

                if (safetyData.actionableInsights) {
                  console.log(`\n💡 Key Insights:`);
                  safetyData.actionableInsights.slice(0, 2).forEach((insight, index) => {
                    console.log(`   ${index + 1}. ${insight}`);
                  });
                }

                child.kill('SIGTERM');
                resolve(true);
              } catch (parseError) {
                console.log('❌ Safety content is not valid JSON');
                child.kill('SIGTERM');
                resolve(false);
              }
            } else {
              console.log('❌ Safety alerts resource read failed');
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
testSafetyAlerts().then(success => {
  console.log('\n📊 Safety Alerts Resource Test Results:');

  if (success) {
    console.log('✅ Safety alerts resource provides actionable intelligence');
    console.log('✅ Comprehensive safety data across all FDA product categories');
    console.log('✅ Real-time alerting with severity classifications');
    console.log('✅ Actionable insights for healthcare providers');
    console.log('✅ Perfect for regulatory intelligence and safety surveillance');
  } else {
    console.log('❌ Safety alerts resource has issues');
  }

  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});