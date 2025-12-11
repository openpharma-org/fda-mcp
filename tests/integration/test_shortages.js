#!/usr/bin/env node

import { FDASearch } from './src/fda-search.js';

async function testShortages() {
  console.log('Starting shortages endpoint test...');

  const search = new FDASearch();

  try {
    // Test 1: Simple drug name search
    console.log('\n1. Testing simple drug search...');
    const result1 = await search.searchDrug('ketorolac', 'shortages', 2);
    console.log('SUCCESS: Simple search worked!');
    console.log('Total results:', result1.metadata.total);
    console.log('First result has new fields:', !!result1.results[0]?.openfda?.application_number, !!result1.results[0]?.openfda?.generic_name);

    // Test 2: Field-specific search
    console.log('\n2. Testing field-specific search...');
    const result2 = await search.searchDrug('Injection', 'shortages', 2, 'dosage_form');
    console.log('SUCCESS: Field search worked!');
    console.log('Total results:', result2.metadata.total);

    // Test 3: Complex query
    console.log('\n3. Testing complex query...');
    const result3 = await search.searchDrug('status:"Current"+AND+dosage_form:"Injection"', 'shortages', 2);
    console.log('SUCCESS: Complex query worked!');
    console.log('Total results:', result3.metadata.total);

    // Test 4: Status field search
    console.log('\n4. Testing status field search...');
    const result4 = await search.searchDrug('Resolved', 'shortages', 2, 'status');
    console.log('SUCCESS: Status search worked!');
    console.log('Total results:', result4.metadata.total);

    // Test 5: Therapeutic category search
    console.log('\n5. Testing therapeutic category search...');
    const result5 = await search.searchDrug('Oncology', 'shortages', 2, 'therapeutic_category');
    console.log('SUCCESS: Therapeutic category search worked!');
    console.log('Total results:', result5.metadata.total);

    console.log('\nAll tests passed! Shortages endpoint is working correctly.');

  } catch (error) {
    console.log('ERROR: Test failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

testShortages();