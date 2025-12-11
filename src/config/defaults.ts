/**
 * Default configuration values for FDA MCP Server
 */

import { ConfigurationDefaults } from './types.js';

export const DEFAULT_CONFIGURATION: ConfigurationDefaults = {
  server: {
    name: 'fda-mcp-server',
    version: '1.0.0',
    description: 'FDA MCP Server for drug and device information lookup',
    author: 'FDA MCP Team',
    license: 'MIT'
  },

  api: {
    baseUrl: 'https://api.fda.gov',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    userAgent: 'fda-mcp-server/1.0.0'
  },

  logging: {
    level: 'info',
    enableRequestLogging: true,
    enableResponseLogging: false,
    enableErrorLogging: true,
    logFormat: 'json',
    logDestination: 'console',
    maxLogFileSize: 10485760, // 10MB
    maxLogFiles: 5
  },

  performance: {
    maxConcurrentRequests: 10,
    rateLimitPerMinute: 60,
    requestQueueSize: 100,
    cacheEnabled: true,
    cacheTtlSeconds: 300, // 5 minutes
    maxCacheSize: 1000,
    requestDeduplicationEnabled: true
  },

  security: {
    enableCors: true,
    corsOrigins: ['*'],
    enableRateLimit: true,
    trustProxy: false,
    maxRequestSize: '1mb'
  },

  features: {
    enableMetrics: true,
    enableHealthCheck: true,
    enablePrompts: true,
    enableTools: true,
    enableAdvancedSearch: true,
    enableCaching: true
  },

  validation: {
    strictParameterValidation: true,
    enableSchemaValidation: true,
    maxSearchTermLength: 500,
    allowedSearchTypes: [
      'general',
      'label',
      'adverse_events',
      'recalls',
      'shortages',
      'device_registration',
      'device_pma',
      'device_510k',
      'device_udi',
      'device_recalls',
      'device_adverse_events',
      'device_classification'
    ],
    requiredParameters: ['search_term']
  }
};

export const DEVELOPMENT_OVERRIDES = {
  logging: {
    level: 'debug' as const,
    enableRequestLogging: true,
    enableResponseLogging: true,
    enableErrorLogging: true
  },
  performance: {
    cacheEnabled: false
  },
  features: {
    enableMetrics: true
  }
};

export const PRODUCTION_OVERRIDES = {
  logging: {
    level: 'warn' as const,
    enableRequestLogging: false,
    enableResponseLogging: false,
    enableErrorLogging: true,
    logDestination: 'file' as const,
    logFilePath: '/var/log/fda-mcp-server.log'
  },
  performance: {
    maxConcurrentRequests: 50,
    rateLimitPerMinute: 1000,
    cacheEnabled: true
  },
  security: {
    corsOrigins: [],
    trustProxy: true
  }
};

export const TEST_OVERRIDES = {
  logging: {
    level: 'error' as const,
    enableRequestLogging: false,
    enableResponseLogging: false,
    enableErrorLogging: false
  },
  api: {
    timeout: 5000,
    retryAttempts: 1
  },
  performance: {
    maxConcurrentRequests: 5,
    rateLimitPerMinute: 100,
    cacheEnabled: false
  },
  features: {
    enableMetrics: false,
    enableHealthCheck: false
  }
};

export function getEnvironmentDefaults(nodeEnv: string) {
  switch (nodeEnv) {
    case 'development':
      return DEVELOPMENT_OVERRIDES;
    case 'production':
      return PRODUCTION_OVERRIDES;
    case 'test':
      return TEST_OVERRIDES;
    default:
      return {};
  }
}

export const FDA_API_ENDPOINTS = {
  drug: {
    general: '/drug/drugsfda.json',
    label: '/drug/label.json',
    adverse_events: '/drug/event.json',
    recalls: '/drug/enforcement.json',
    shortages: '/drug/shortages.json'
  },
  device: {
    registration: '/device/registrationlisting.json',
    pma: '/device/pma.json',
    '510k': '/device/510k.json',
    udi: '/device/udi.json',
    recalls: '/device/enforcement.json',
    adverse_events: '/device/event.json',
    classification: '/device/classification.json'
  }
};

export const SEARCH_FIELD_MAPPINGS = {
  drug: {
    general: ['sponsor_name', 'products.brand_name', 'products.generic_name'],
    label: ['openfda.brand_name', 'openfda.generic_name', 'openfda.manufacturer_name'],
    adverse_events: ['patient.drug.medicinalproduct', 'companynumb'],
    recalls: ['product_description', 'recalling_firm'],
    shortages: ['product_name', 'manufacturer']
  },
  device: {
    registration: ['proprietary_name', 'establishment_name'],
    pma: ['device_name', 'applicant'],
    '510k': ['device_name', 'applicant'],
    udi: ['device_description', 'brand_name'],
    recalls: ['product_description', 'recalling_firm'],
    adverse_events: ['device.brand_name', 'manufacturer_name'],
    classification: ['device_name', 'medical_specialty_description']
  }
};

export const DEFAULT_QUERY_LIMITS = {
  min: 1,
  max: 100,
  default: 10
};

export const DEFAULT_CACHE_KEYS = {
  drug_search: 'drug:search:',
  device_search: 'device:search:',
  prompt_result: 'prompt:result:',
  tool_result: 'tool:result:'
};