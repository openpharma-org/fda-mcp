/**
 * Test script to demonstrate progress tracking and cancellation features
 * Run with: LOG_LEVEL=debug node test-cancellation.js
 *
 * This script demonstrates the MCP 2025-06-18 compliance features:
 * - Progress tracking for long-running operations
 * - Cancellation mechanisms for active operations
 * - Enhanced error reporting with cancellation status
 */

import { FdaInfoTool } from './build/tools/fda-info.js';

async function testProgressAndCancellation() {
  console.log('🧪 Testing progress tracking and cancellation...\n');

  const tool = new FdaInfoTool();

  // Test parameters for a real API call
  const params = {
    method: 'lookup_drug',
    search_term: 'cancer therapy',
    search_type: 'general',
    limit: 10
  };

  console.log('📋 Request parameters:', JSON.stringify(params, null, 2));
  console.log('\n🚀 Starting operation with progress tracking...\n');

  // Set up progress tracking
  let progressUpdates = [];
  const mockProgressCallback = (progress) => {
    progressUpdates.push(progress);
    console.log(`📈 Progress: ${progress.progress}% - ${progress.stage} - ${progress.message}`);
  };

  try {
    const startTime = Date.now();

    // Create a request ID for testing
    const requestId = 'test-progress-' + Date.now();

    // Set progress callback
    tool.setProgressCallback(requestId, mockProgressCallback);

    // Execute the tool (this will show progress updates)
    const result = await tool.execute(params, requestId);

    const endTime = Date.now();

    console.log(`\n✅ Operation completed in ${endTime - startTime}ms`);

    if (result.success) {
      console.log('🎯 Tool execution successful');
      console.log(`📊 Results found: ${result.data?.results?.length || 0}`);
      console.log(`📁 Cache status: ${result.metadata?.fromCache ? 'HIT' : 'MISS'}`);
    } else {
      console.log('❌ Tool execution failed:', result.error?.error);
    }

    console.log(`\n📈 Progress Updates Received: ${progressUpdates.length}`);
    progressUpdates.forEach((update, index) => {
      console.log(`   ${index + 1}. ${update.stage} (${update.progress}%): ${update.message}`);
    });

    // Test active operations tracking
    const activeOps = tool.getActiveOperations();
    console.log(`\n🔄 Active Operations: ${activeOps.length}`);

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }

  // Test cancellation capability
  console.log('\n🛑 Testing cancellation capability...');

  try {
    const cancelRequestId = 'test-cancel-' + Date.now();

    // Start a long operation
    const cancelPromise = tool.execute({
      method: 'lookup_drug',
      search_term: 'comprehensive drug search with many results',
      search_type: 'general',
      limit: 50
    }, cancelRequestId);

    // Wait a moment, then cancel
    setTimeout(() => {
      console.log('⏰ Attempting to cancel operation...');
      const cancelled = tool.cancelOperation(cancelRequestId, 'User requested cancellation');
      console.log(`🛑 Cancellation ${cancelled ? 'successful' : 'failed'}`);
    }, 100);

    const cancelResult = await cancelPromise;

    if (cancelResult.metadata?.cancelled) {
      console.log('✅ Operation was successfully cancelled');
    } else {
      console.log('ℹ️  Operation completed before cancellation');
    }

  } catch (error) {
    if (error.message.includes('cancelled')) {
      console.log('✅ Cancellation exception caught:', error.message);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Run the test
testProgressAndCancellation().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});