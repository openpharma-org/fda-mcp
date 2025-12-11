#!/usr/bin/env node

/**
 * Test script to verify the new count and pharmacological class features
 */

import { FDASearch } from './src/fda-search.js';

const fdaSearch = new FDASearch();

async function testCountParameter() {
  console.log('\n🧪 Testing Count Parameter...');

  try {
    // Test count by serious adverse events
    const result = await fdaSearch.searchDrug(
      'serious:1',
      'adverse_events',
      5,
      null,
      'patient.patientsex' // Count by gender
    );

    console.log('Count test result:', JSON.stringify(result, null, 2));

    // Check if we got count data or individual records
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.term && firstResult.count) {
        console.log('✅ Count parameter is working - returned aggregated data');
      } else if (firstResult.safetyreportid) {
        console.log('❌ Count parameter not working - returned individual records');
      }
    }
  } catch (error) {
    console.log('❌ Count test failed:', error.message);
  }
}

async function testPharmClass() {
  console.log('\n🧪 Testing Pharmacological Class Filter...');

  try {
    // Test search with pharm class
    const result = await fdaSearch.searchDrug(
      '*',
      'adverse_events',
      3,
      null,
      null,
      'nonsteroidal anti-inflammatory drug'
    );

    console.log('Pharm class test query:', result.query);
    console.log('Total results:', result.total_results);
    console.log('First result drugs:', result.results[0]?.patient?.drug?.map(d => d.medicinalproduct));

    // Check if the results actually contain NSAID drugs
    if (result.results && result.results.length > 0) {
      const drugs = result.results[0]?.patient?.drug || [];
      console.log('Drug details:', drugs.map(d => ({
        name: d.medicinalproduct,
        pharm_class: d.openfda?.pharm_class_epc
      })));
    }
  } catch (error) {
    console.log('❌ Pharm class test failed:', error.message);
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
    // Test count parameter URL
    await fdaSearch.searchDrug('serious:1', 'adverse_events', 5, null, 'patient.patientsex');
  } catch (error) {
    // Expected to fail since we're just logging URLs
  }

  try {
    // Test pharm class URL
    await fdaSearch.searchDrug('*', 'adverse_events', 3, null, null, 'nonsteroidal anti-inflammatory drug');
  } catch (error) {
    // Expected to fail since we're just logging URLs
  }

  // Restore original methods
  fdaSearch.formatUrl = originalFormatUrl;
  fdaSearch.makeRequest = originalMakeRequest;
}

async function main() {
  console.log('🚀 Testing FDA MCP Server New Features');
  console.log('=====================================');

  await testAPIUrlConstruction();
  await testCountParameter();
  await testPharmClass();
}

main().catch(console.error);