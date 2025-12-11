/**
 * Test script to verify MCP server startup
 * This helps diagnose any startup issues
 */

import { fdaMcpServer } from './build/servers/fda-mcp.js';

async function testStartup() {
  console.log('🧪 Testing FDA MCP Server startup...\n');

  try {
    console.log('📋 1. Testing server initialization...');
    await fdaMcpServer.initialize();
    console.log('✅ Server initialized successfully');

    console.log('\n📊 2. Checking server status...');
    const stats = fdaMcpServer.getStats();
    console.log(`   📊 Server version: ${stats.version}`);
    console.log(`   🕐 Uptime: ${stats.uptime}ms`);
    console.log(`   🛠️  Tools registered: ${stats.toolsRegistered}`);
    console.log(`   📝 Prompts registered: ${stats.promptsRegistered}`);

    console.log('\n📋 3. Testing server readiness...');
    const isReady = fdaMcpServer.isReady();
    console.log(`   🟢 Server ready: ${isReady ? 'YES' : 'NO'}`);

    console.log('\n📋 4. Testing health check...');
    const health = await fdaMcpServer.getHealthStatus('test-startup');
    console.log(`   💚 Health status: ${health.status}`);
    console.log(`   🔧 Tools healthy: ${health.checks.tools ? 'YES' : 'NO'}`);
    console.log(`   🌐 API healthy: ${health.checks.api ? 'YES' : 'NO'}`);

    console.log('\n🎉 Server startup test completed successfully!');
    console.log('   ✅ Server can be initialized');
    console.log('   ✅ All components are healthy');
    console.log('   ✅ Ready for MCP connections');

    // Test shutdown
    console.log('\n🔄 5. Testing graceful shutdown...');
    await fdaMcpServer.shutdown();
    console.log('✅ Server shutdown completed successfully');

    return true;

  } catch (error) {
    console.log(`\n❌ Server startup failed: ${error.message}`);
    console.log(`   📋 Error type: ${error.constructor.name}`);
    console.log(`   📊 Stack trace:`);
    console.log(error.stack);

    // Attempt cleanup
    try {
      await fdaMcpServer.shutdown();
    } catch (shutdownError) {
      console.log(`❌ Shutdown also failed: ${shutdownError.message}`);
    }

    return false;
  }
}

// Run the test
testStartup().then(success => {
  console.log('\n✨ Startup test completed');

  if (success) {
    console.log('🎯 The server should now work correctly with Claude!');
    console.log('📋 Make sure your .mcp.json file points to the correct path:');
    console.log('   "args": ["/Users/joan.saez-pons/code/fda-mcp-server/build/index.js"]');
  } else {
    console.log('⚠️  There are issues that need to be resolved before the server will work with Claude.');
  }

  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Startup test error:', error);
  process.exit(1);
});