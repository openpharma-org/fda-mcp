/**
 * Test script to demonstrate request deduplication
 * Run with: LOG_LEVEL=debug node test-deduplication.js
 *
 * This script simulates multiple identical API requests to demonstrate
 * how the deduplication feature prevents redundant calls to the FDA API.
 */

import { FdaApiClient } from './build/api/client.js';

async function testDeduplication() {
  console.log('🧪 Testing request deduplication...\n');

  const client = new FdaApiClient({ deduplicationEnabled: true });

  // Create identical request parameters
  const params = {
    method: 'lookup_drug',
    search_term: 'aspirin',
    search_type: 'general',
    limit: 5
  };

  console.log('📋 Request parameters:', JSON.stringify(params, null, 2));
  console.log('\n🚀 Starting 3 identical concurrent requests...\n');

  const startTime = Date.now();

  // Fire 3 identical requests simultaneously
  const requests = [
    client.search(params, 'test-request-1'),
    client.search(params, 'test-request-2'),
    client.search(params, 'test-request-3')
  ];

  try {
    const results = await Promise.all(requests);
    const endTime = Date.now();

    console.log(`✅ All requests completed in ${endTime - startTime}ms\n`);

    // Verify all requests returned the same data
    const firstResult = JSON.stringify(results[0]);
    const allIdentical = results.every(result =>
      JSON.stringify(result) === firstResult
    );

    console.log(`🔍 All responses identical: ${allIdentical ? '✅' : '❌'}`);
    console.log(`📊 Response data size: ${firstResult.length} characters\n`);

    // Get deduplication statistics
    const stats = client.getRequestStats();
    const ongoingStatus = client.getOngoingRequestsStatus();

    console.log('📈 Deduplication Statistics:');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Deduplicated: ${stats.deduplicatedRequests}`);
    console.log(`   Deduplication Rate: ${stats.deduplicationRate}%`);
    console.log(`   Ongoing Requests: ${ongoingStatus.count}`);

    if (stats.deduplicationRate > 0) {
      console.log('\n🎉 Request deduplication is working correctly!');
    } else {
      console.log('\n⚠️  No deduplication detected - requests may have completed too quickly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDeduplication().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});