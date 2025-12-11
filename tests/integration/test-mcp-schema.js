/**
 * Test script to demonstrate MCP 2025-06-18 schema validation compliance
 * Run with: LOG_LEVEL=debug node test-mcp-schema.js
 *
 * This script tests:
 * 1. JSON-RPC 2.0 request/response validation
 * 2. MCP method validation
 * 3. Parameter schema validation
 * 4. Error response formatting
 * 5. FDA-specific schema enhancements
 */

import { mcpValidator } from './build/utils/mcp-validator.js';
import { SchemaRegistry, validateMcpData } from './build/types/mcp-schemas.js';

async function testMcpSchemaCompliance() {
  console.log('🧪 Testing MCP 2025-06-18 Schema Validation Compliance...\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        passedTests++;
      } else {
        console.log(`❌ ${name}: Test failed`);
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // 1. Test JSON-RPC 2.0 Request Validation
  console.log('📋 1. JSON-RPC 2.0 Request Validation');

  test('Valid JSON-RPC request', () => {
    const validRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'fda_info', arguments: { method: 'lookup_drug', search_term: 'aspirin' } },
      id: '123'
    };

    const result = mcpValidator.validateRequest(validRequest);
    return result.success;
  });

  test('Invalid JSON-RPC version', () => {
    const invalidRequest = {
      jsonrpc: '1.0',
      method: 'tools/call',
      params: {},
      id: '123'
    };

    const result = mcpValidator.validateRequest(invalidRequest);
    return !result.success && result.errors?.some(e => e.includes('2.0'));
  });

  test('Missing required method', () => {
    const invalidRequest = {
      jsonrpc: '2.0',
      params: {},
      id: '123'
    };

    const result = mcpValidator.validateRequest(invalidRequest);
    return !result.success;
  });

  // 2. Test MCP Method Validation
  console.log('\n🎯 2. MCP Method Validation');

  test('Valid MCP method: tools/call', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'fda_info' },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return result.success;
  });

  test('Valid MCP method: completion/complete', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'completion/complete',
      params: {
        ref: { type: 'prompt', name: 'test' },
        argument: { name: 'search_term', value: 'asp' }
      },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return result.success;
  });

  test('Invalid MCP method', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'invalid/method',
      params: {},
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return !result.success && result.errorCode === -32601;
  });

  // 3. Test Parameter Schema Validation
  console.log('\n📊 3. Parameter Schema Validation');

  test('Valid FDA request parameters', () => {
    const fdaParams = {
      method: 'lookup_drug',
      search_term: 'aspirin',
      search_type: 'general',
      limit: 10
    };

    const result = validateMcpData(SchemaRegistry.fdaRequest, fdaParams);
    return result.success;
  });

  test('Invalid FDA method', () => {
    const fdaParams = {
      method: 'invalid_method',
      search_term: 'aspirin'
    };

    const result = validateMcpData(SchemaRegistry.fdaRequest, fdaParams);
    return !result.success;
  });

  test('FDA search term too long', () => {
    const fdaParams = {
      method: 'lookup_drug',
      search_term: 'a'.repeat(501), // Exceeds 500 character limit
      limit: 10
    };

    const result = validateMcpData(SchemaRegistry.fdaRequest, fdaParams);
    return !result.success && result.errors.some(e => e.includes('500'));
  });

  test('FDA limit out of bounds', () => {
    const fdaParams = {
      method: 'lookup_drug',
      search_term: 'aspirin',
      limit: 150 // Exceeds maximum of 100
    };

    const result = validateMcpData(SchemaRegistry.fdaRequest, fdaParams);
    return !result.success && result.errors.some(e => e.includes('100'));
  });

  // 4. Test Error Response Formatting
  console.log('\n🚫 4. Error Response Formatting');

  test('Valid error response creation', () => {
    const errorResponse = mcpValidator.createErrorResponse(
      '123',
      -32602,
      'Invalid params',
      { field: 'search_term' }
    );

    const validation = mcpValidator.validateResponse(errorResponse);
    return validation.success &&
           errorResponse.jsonrpc === '2.0' &&
           errorResponse.error.code === -32602;
  });

  test('Valid success response creation', () => {
    const successResponse = mcpValidator.createSuccessResponse(
      '123',
      { success: true, data: [] }
    );

    const validation = mcpValidator.validateResponse(successResponse);
    return validation.success &&
           successResponse.jsonrpc === '2.0' &&
           successResponse.result.success === true;
  });

  // 5. Test Resource URI Validation
  console.log('\n🔗 5. Resource URI Validation');

  test('Valid resource URI', () => {
    const uri = 'fda://safety/alerts/current';
    const result = validateMcpData(SchemaRegistry.resourceUri, uri);
    return result.success;
  });

  test('Invalid resource URI', () => {
    const uri = 'not-a-valid-uri';
    const result = validateMcpData(SchemaRegistry.resourceUri, uri);
    return !result.success;
  });

  // 6. Test Tool Call Parameter Validation
  console.log('\n🛠️ 6. Tool Call Parameter Validation');

  test('Valid tool call parameters', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'fda_info',
        arguments: {
          method: 'lookup_drug',
          search_term: 'aspirin',
          limit: 5
        }
      },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return result.success;
  });

  test('Tool call missing name', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: { search_term: 'aspirin' }
      },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return !result.success && result.errorCode === -32602;
  });

  // 7. Test Logging Parameter Validation
  console.log('\n📝 7. Logging Parameter Validation');

  test('Valid logging setLevel parameters', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'logging/setLevel',
      params: { level: 'info' },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return result.success;
  });

  test('Invalid log level', () => {
    const request = {
      jsonrpc: '2.0',
      method: 'logging/setLevel',
      params: { level: 'invalid_level' },
      id: '123'
    };

    const result = mcpValidator.validateRequest(request);
    return !result.success && result.errorCode === -32602;
  });

  // 8. Test Content Type Validation
  console.log('\n📄 8. Content Type Validation');

  test('Valid text content', () => {
    const content = {
      type: 'text',
      text: 'This is valid text content'
    };

    const result = validateMcpData(SchemaRegistry.textContent, content);
    return result.success;
  });

  test('Valid image content', () => {
    const content = {
      type: 'image',
      data: 'base64encodeddata',
      mimeType: 'image/png',
      width: 100,
      height: 100
    };

    const result = validateMcpData(SchemaRegistry.imageContent, content);
    return result.success;
  });

  test('Invalid image MIME type', () => {
    const content = {
      type: 'image',
      data: 'base64encodeddata',
      mimeType: 'text/plain' // Invalid for image
    };

    const result = validateMcpData(SchemaRegistry.imageContent, content);
    return !result.success;
  });

  // Summary
  console.log('\n📊 MCP 2025-06-18 Schema Validation Summary:');
  console.log(`   ✅ Tests passed: ${passedTests}/${totalTests}`);
  console.log(`   📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All MCP schema validation tests passed!');
    console.log('   ✅ JSON-RPC 2.0 compliance');
    console.log('   ✅ MCP method validation');
    console.log('   ✅ Parameter schema validation');
    console.log('   ✅ Error response formatting');
    console.log('   ✅ FDA-specific schema enhancements');
    console.log('   ✅ Resource URI validation');
    console.log('   ✅ Content type validation');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} tests failed - review implementation`);
  }

  // Get validation service stats
  const validatorStats = mcpValidator.getStats();
  console.log('\n📈 Validator Statistics:');
  console.log(`   🔧 Supported methods: ${validatorStats.supportedMethods.length}`);
  console.log(`   ⚙️  Strict mode: ${validatorStats.config.strictMode ? 'ON' : 'OFF'}`);
  console.log(`   📋 Validation logging: ${validatorStats.config.logValidationErrors ? 'ON' : 'OFF'}`);

  return passedTests === totalTests;
}

// Run the test
testMcpSchemaCompliance().then(success => {
  console.log('\n✨ Schema compliance test completed');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Schema test error:', error);
  process.exit(1);
});