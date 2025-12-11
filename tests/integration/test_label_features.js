#!/usr/bin/env node

/**
 * Test script to verify the new label endpoint features:
 * 1. Boxed warning search
 * 2. Product type count aggregation
 */

import { FDASearch } from './src/fda-search.js';

const fdaSearch = new FDASearch();

async function testBoxedWarningSearch() {
  console.log('\n🧪 Testing Boxed Warning Search...');

  try {
    // Test 1: Search for all drugs with boxed warnings
    console.log('\n📋 Test 1: All drugs with boxed warnings');
    const result1 = await fdaSearch.searchDrug('*', 'label', 5, null, null, null, true);

    console.log('Query results:', {
      total: result1.total_results,
      returned: result1.results.length,
      first_drug: result1.results[0]?.openfda?.brand_name?.[0] || result1.results[0]?.openfda?.generic_name?.[0] || 'Unknown'
    });

    // Check if boxed_warning field exists in results
    const hasBoxedWarning = result1.results[0]?.boxed_warning;
    if (hasBoxedWarning) {
      console.log('✅ Boxed warning search working - found drugs with boxed warnings');
      console.log('Sample boxed warning snippet:', hasBoxedWarning[0].substring(0, 100) + '...');
    } else {
      console.log('❌ Boxed warning search may not be working - no boxed_warning field found');
    }

    // Test 2: Search for specific drug (naproxen) with boxed warnings
    console.log('\n📋 Test 2: Naproxen with boxed warnings');
    const result2 = await fdaSearch.searchDrug('naproxen', 'label', 3, null, null, null, true);

    console.log('Naproxen boxed warning results:', {
      total: result2.total_results,
      returned: result2.results.length
    });

    if (result2.results.length > 0 && result2.results[0]?.boxed_warning) {
      console.log('✅ Specific drug boxed warning search working');
    } else {
      console.log('❌ Specific drug boxed warning search may not be working');
    }

  } catch (error) {
    console.log('❌ Boxed warning test failed:', error.message);
  }
}

async function testProductTypeCount() {
  console.log('\n🧪 Testing Product Type Count...');

  try {
    // Test count by product type
    const result = await fdaSearch.searchDrug('*', 'label', 5, null, 'openfda.product_type.exact');

    console.log('Product type count results:', {
      total_entries: result.results.length,
      results: result.results
    });

    // Check if we got count data
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.term && firstResult.count) {
        console.log('✅ Product type count working - returned aggregated data');
        console.log('Sample counts:');
        result.results.forEach(item => {
          console.log(`  ${item.term}: ${item.count.toLocaleString()}`);
        });
      } else {
        console.log('❌ Count parameter not working - returned individual records instead of aggregated data');
      }
    } else {
      console.log('❌ No results returned for count query');
    }

  } catch (error) {
    console.log('❌ Product type count test failed:', error.message);
  }
}

async function testCombinedFeatures() {
  console.log('\n🧪 Testing Combined Features...');

  try {
    // Test count of boxed warning drugs by manufacturer
    const result = await fdaSearch.searchDrug('*', 'label', 10, null, 'openfda.manufacturer_name.exact', null, true);

    console.log('Combined test (boxed warnings by manufacturer):', {
      total_entries: result.results.length,
      sample_results: result.results.slice(0, 3)
    });

    if (result.results && result.results.length > 0 && result.results[0].term && result.results[0].count) {
      console.log('✅ Combined features working - count of boxed warning drugs by manufacturer');
    } else {
      console.log('❌ Combined features may not be working correctly');
    }

  } catch (error) {
    console.log('❌ Combined features test failed:', error.message);
  }
}

async function testAPIUrlConstruction() {
  console.log('\n🔍 Testing API URL Construction...');

  // Mock the formatUrl and makeRequest to see what URLs are being generated
  const originalFormatUrl = fdaSearch.formatUrl;
  const originalMakeRequest = fdaSearch.makeRequest;

  fdaSearch.formatUrl = function(endpoint, params, baseUrl) {
    const url = originalFormatUrl.call(this, endpoint, params, baseUrl);
    console.log('Generated URL:', url);
    return url;
  };

  fdaSearch.makeRequest = async function(url) {
    console.log('Making request to:', url);
    // Don't actually make the request, just log the URL
    throw new Error('URL logging test - not making actual request');
  };

  try {
    // Test boxed warning URL
    console.log('\n📋 Testing boxed warning URL generation:');
    await fdaSearch.searchDrug('*', 'label', 5, null, null, null, true);
  } catch (error) {
    // Expected to fail since we're just logging URLs
  }

  try {
    // Test count URL
    console.log('\n📋 Testing count URL generation:');
    await fdaSearch.searchDrug('*', 'label', 5, null, 'openfda.product_type.exact');
  } catch (error) {
    // Expected to fail since we're just logging URLs
  }

  // Restore original methods
  fdaSearch.formatUrl = originalFormatUrl;
  fdaSearch.makeRequest = originalMakeRequest;
}

async function main() {
  console.log('🚀 Testing FDA MCP Server Label Endpoint New Features');
  console.log('======================================================');

  await testAPIUrlConstruction();
  await testBoxedWarningSearch();
  await testProductTypeCount();
  await testCombinedFeatures();

  console.log('\n✅ All tests completed!');
}

main().catch(console.error);