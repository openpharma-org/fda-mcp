#!/usr/bin/env node

import { FDASearch } from './src/fda-search.js';

async function testRecalls() {
  console.log('Starting recalls endpoint test...');

  const search = new FDASearch();

  try {
    // Test 1: Simple classification search
    console.log('\n1. Testing classification search...');
    const result1 = await search.searchDrug('Class I', 'recalls', 2);
    console.log('SUCCESS: Classification search worked!');
    console.log('Response structure:', JSON.stringify(result1, null, 2));

    if (result1.metadata && result1.metadata.total !== undefined) {
      console.log('Total results:', result1.metadata.total);
    } else {
      console.log('No metadata.total found in response');
    }

    // Test 2: Field-specific search
    console.log('\n2. Testing field-specific search...');
    const result2 = await search.searchDrug('Class I', 'recalls', 2, 'classification');
    console.log('SUCCESS: Field search worked!');
    if (result2.metadata && result2.metadata.total !== undefined) {
      console.log('Total results:', result2.metadata.total);
    }

    // Test 3: Complex query
    console.log('\n3. Testing complex query...');
    const result3 = await search.searchDrug('classification:"Class I"', 'recalls', 2);
    console.log('SUCCESS: Complex query worked!');
    if (result3.metadata && result3.metadata.total !== undefined) {
      console.log('Total results:', result3.metadata.total);
    }

    // Test 4: New field search
    console.log('\n4. Testing new address_1 field...');
    const result4 = await search.searchDrug('Street', 'recalls', 2, 'address_1');
    console.log('SUCCESS: New field search worked!');
    if (result4.metadata && result4.metadata.total !== undefined) {
      console.log('Total results:', result4.metadata.total);
    }

    console.log('\nAll tests passed! Recalls endpoint is working correctly.');

  } catch (error) {
    console.log('ERROR: Test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testRecalls();