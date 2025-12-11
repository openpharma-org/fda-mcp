#!/usr/bin/env node

/**
 * Test script to verify the new generic field_exists parameter
 * Tests multiple field types beyond just boxed_warning
 */

import { FDASearch } from './src/fda-search.js';

const fdaSearch = new FDASearch();

async function testBoxedWarning() {
  console.log('\n🧪 Testing field_exists with boxed_warning...');

  try {
    const result = await fdaSearch.searchDrug('*', 'label', 3, null, null, null, 'boxed_warning');

    console.log('Boxed warning results:', {
      total: result.total_results,
      returned: result.results.length,
      has_boxed_warning: !!result.results[0]?.boxed_warning
    });

    if (result.results[0]?.boxed_warning) {
      console.log('✅ Boxed warning field_exists working');
    } else {
      console.log('❌ Boxed warning field_exists failed');
    }
  } catch (error) {
    console.log('❌ Boxed warning test failed:', error.message);
  }
}

async function testContraindications() {
  console.log('\n🧪 Testing field_exists with contraindications...');

  try {
    const result = await fdaSearch.searchDrug('*', 'label', 3, null, null, null, 'contraindications');

    console.log('Contraindications results:', {
      total: result.total_results,
      returned: result.results.length,
      has_contraindications: !!result.results[0]?.contraindications
    });

    if (result.results[0]?.contraindications) {
      console.log('✅ Contraindications field_exists working');
      console.log('Sample contraindication:', result.results[0].contraindications[0].substring(0, 100) + '...');
    } else {
      console.log('❌ Contraindications field_exists failed');
    }
  } catch (error) {
    console.log('❌ Contraindications test failed:', error.message);
  }
}

async function testDrugInteractions() {
  console.log('\n🧪 Testing field_exists with drug_interactions...');

  try {
    const result = await fdaSearch.searchDrug('*', 'label', 3, null, null, null, 'drug_interactions');

    console.log('Drug interactions results:', {
      total: result.total_results,
      returned: result.results.length,
      has_drug_interactions: !!result.results[0]?.drug_interactions
    });

    if (result.results[0]?.drug_interactions) {
      console.log('✅ Drug interactions field_exists working');
    } else {
      console.log('❌ Drug interactions field_exists failed');
    }
  } catch (error) {
    console.log('❌ Drug interactions test failed:', error.message);
  }
}

async function testPregnancy() {
  console.log('\n🧪 Testing field_exists with pregnancy...');

  try {
    const result = await fdaSearch.searchDrug('*', 'label', 3, null, null, null, 'pregnancy');

    console.log('Pregnancy results:', {
      total: result.total_results,
      returned: result.results.length,
      has_pregnancy: !!result.results[0]?.pregnancy
    });

    if (result.results[0]?.pregnancy) {
      console.log('✅ Pregnancy field_exists working');
    } else {
      console.log('❌ Pregnancy field_exists failed');
    }
  } catch (error) {
    console.log('❌ Pregnancy test failed:', error.message);
  }
}

async function testURLGeneration() {
  console.log('\n🔍 Testing URL generation for field_exists...');

  const originalFormatUrl = fdaSearch.formatUrl;
  const originalMakeRequest = fdaSearch.makeRequest;

  fdaSearch.formatUrl = function(endpoint, params, baseUrl) {
    const url = originalFormatUrl.call(this, endpoint, params, baseUrl);
    console.log('Generated URL:', url);
    return url;
  };

  fdaSearch.makeRequest = async function(url) {
    throw new Error('URL logging test - not making actual request');
  };

  const tests = [
    { field: 'boxed_warning', description: 'Boxed warning URL' },
    { field: 'contraindications', description: 'Contraindications URL' },
    { field: 'drug_interactions', description: 'Drug interactions URL' },
    { field: 'pregnancy', description: 'Pregnancy URL' }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📋 Testing ${test.description}:`);
      await fdaSearch.searchDrug('*', 'label', 5, null, null, null, test.field);
    } catch (error) {
      // Expected to fail since we're just logging URLs
    }
  }

  // Restore original methods
  fdaSearch.formatUrl = originalFormatUrl;
  fdaSearch.makeRequest = originalMakeRequest;
}

async function main() {
  console.log('🚀 Testing Generic field_exists Parameter');
  console.log('=========================================');

  await testURLGeneration();
  await testBoxedWarning();
  await testContraindications();
  await testDrugInteractions();
  await testPregnancy();

  console.log('\n✅ All field_exists tests completed!');
}

main().catch(console.error);