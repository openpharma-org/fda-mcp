/**
 * MCP 2025-06-18 Schema Validation and Compliance
 * Implements the schema requirements as per the specification
 */

import { z } from 'zod';

// ============================================================================
// Primitive Schema Definitions (MCP Specification)
// ============================================================================

/**
 * MCP String schema with validation constraints
 */
export const McpStringSchema = z.object({
  type: z.literal('string'),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  format: z.enum(['uri', 'email', 'date', 'date-time', 'uuid']).optional(),
  pattern: z.string().optional(),
  description: z.string().optional()
});

/**
 * MCP Number schema with validation constraints
 */
export const McpNumberSchema = z.object({
  type: z.literal('number'),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  multipleOf: z.number().optional(),
  description: z.string().optional()
});

/**
 * MCP Boolean schema
 */
export const McpBooleanSchema = z.object({
  type: z.literal('boolean'),
  description: z.string().optional()
});

/**
 * MCP Enum schema
 */
export const McpEnumSchema = z.object({
  type: z.literal('string'),
  enum: z.array(z.string()).min(1),
  description: z.string().optional()
});

/**
 * MCP Array schema
 */
export const McpArraySchema = z.object({
  type: z.literal('array'),
  items: z.any(), // Will be refined based on context
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  uniqueItems: z.boolean().optional(),
  description: z.string().optional()
});

/**
 * MCP Object schema
 */
export const McpObjectSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().default(false),
  description: z.string().optional()
});

// ============================================================================
// Resource Schema Definitions
// ============================================================================

/**
 * MCP Resource URI validation (RFC 3986 compliant)
 */
export const McpResourceUriSchema = z.string().regex(
  /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s]*$/,
  'Resource URI must be a valid URI scheme'
);

/**
 * MCP Resource metadata
 */
export const McpResourceMetadataSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  annotations: z.object({
    audience: z.array(z.string()).optional(),
    priority: z.number().min(0).max(10).optional(),
    lastModified: z.string().datetime().optional()
  }).optional()
});

/**
 * MCP Resource definition
 */
export const McpResourceSchema = z.object({
  uri: McpResourceUriSchema,
  metadata: McpResourceMetadataSchema.optional()
});

// ============================================================================
// Content Type Validation
// ============================================================================

/**
 * MCP Text content
 */
export const McpTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string()
});

/**
 * MCP Image content
 */
export const McpImageContentSchema = z.object({
  type: z.literal('image'),
  data: z.string(), // Base64 encoded
  mimeType: z.string().regex(/^image\//),
  width: z.number().positive().optional(),
  height: z.number().positive().optional()
});

/**
 * MCP Audio content
 */
export const McpAudioContentSchema = z.object({
  type: z.literal('audio'),
  data: z.string(), // Base64 encoded
  mimeType: z.string().regex(/^audio\//),
  duration: z.number().positive().optional()
});

/**
 * MCP Embedded resource content
 */
export const McpEmbeddedResourceSchema = z.object({
  type: z.literal('resource'),
  resource: McpResourceSchema
});

/**
 * Union of all content types
 */
export const McpContentSchema = z.discriminatedUnion('type', [
  McpTextContentSchema,
  McpImageContentSchema,
  McpAudioContentSchema,
  McpEmbeddedResourceSchema
]);

// ============================================================================
// Request/Response Validation (JSON-RPC 2.0)
// ============================================================================

/**
 * JSON-RPC 2.0 Request schema
 */
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string().min(1),
  params: z.any().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional()
});

/**
 * JSON-RPC 2.0 Success Response schema
 */
export const JsonRpcSuccessResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.any(),
  id: z.union([z.string(), z.number(), z.null()])
});

/**
 * JSON-RPC 2.0 Error Response schema
 */
export const JsonRpcErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }),
  id: z.union([z.string(), z.number(), z.null()])
});

/**
 * Union of all JSON-RPC responses
 */
export const JsonRpcResponseSchema = z.union([
  JsonRpcSuccessResponseSchema,
  JsonRpcErrorResponseSchema
]);

// ============================================================================
// Tool Schema Validation
// ============================================================================

/**
 * MCP Tool input schema
 */
export const McpToolInputSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().default(false)
});

/**
 * MCP Tool definition
 */
export const McpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: McpToolInputSchema,
  outputSchema: z.any().optional() // Optional output schema
});

// ============================================================================
// Prompt Schema Validation
// ============================================================================

/**
 * MCP Prompt argument
 */
export const McpPromptArgumentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
  schema: z.any().optional()
});

/**
 * MCP Prompt definition
 */
export const McpPromptSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  arguments: z.array(McpPromptArgumentSchema).optional()
});

// ============================================================================
// MCP Server Capabilities Schema
// ============================================================================

/**
 * MCP Server capabilities
 */
export const McpServerCapabilitiesSchema = z.object({
  tools: z.object({
    listChanged: z.boolean().optional()
  }).optional(),

  prompts: z.object({
    listChanged: z.boolean().optional()
  }).optional(),

  resources: z.object({
    subscribe: z.boolean().optional(),
    listChanged: z.boolean().optional()
  }).optional(),

  logging: z.object({}).optional(),

  completions: z.object({}).optional(),

  experimental: z.record(z.any()).optional()
});

/**
 * MCP Server information
 */
export const McpServerInfoSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  capabilities: McpServerCapabilitiesSchema
});

// ============================================================================
// FDA-Specific Schema Extensions
// ============================================================================

/**
 * FDA API URL validation
 */
export const FdaApiUrlSchema = z.string().url().refine(
  (url) => url.startsWith('https://api.fda.gov/'),
  'FDA API URL must be from api.fda.gov domain'
);

/**
 * FDA search term validation with enhanced constraints
 */
export const FdaSearchTermSchema = z.string()
  .min(1, 'Search term cannot be empty')
  .max(500, 'Search term cannot exceed 500 characters')
  .refine(
    (term) => !/[<>\"'&]/.test(term),
    'Search term contains invalid characters'
  );

/**
 * FDA limit validation
 */
export const FdaLimitSchema = z.number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100');

/**
 * FDA date range validation for YYYYMMDD format
 */
export const FdaDateRangeSchema = z.string()
  .regex(/^\[(\d{8})\s+TO\s+(\d{8})\]$/, 'Date range must be in format [YYYYMMDD TO YYYYMMDD]')
  .optional();

/**
 * Enhanced FDA Request Parameters with MCP compliance
 * Includes ALL FDA adverse events API parameters from official documentation
 */
export const McpFdaRequestParamsSchema = z.object({
  method: z.enum([
    'lookup_drug',
    'lookup_device',
    'search_orange_book',
    'get_therapeutic_equivalents',
    'get_patent_exclusivity',
    'analyze_patent_cliff',
    'search_purple_book',
    'get_biosimilar_interchangeability'
  ], {
    errorMap: () => ({
      message: 'Method must be one of: lookup_drug, lookup_device, search_orange_book, get_therapeutic_equivalents, get_patent_exclusivity, analyze_patent_cliff, search_purple_book, get_biosimilar_interchangeability'
    })
  }),

  search_term: FdaSearchTermSchema,

  search_type: z.enum([
    'general', 'label', 'adverse_events', 'recalls', 'shortages',
    'device_registration', 'device_pma', 'device_510k', 'device_udi',
    'device_recalls', 'device_adverse_events', 'device_classification'
  ]).default('general'),

  limit: FdaLimitSchema.default(10),

  // Core FDA parameters
  count: z.string().optional(),
  pharm_class: z.string().optional(),
  field_exists: z.string().optional(),
  skip: z.number().int().min(0).optional(), // Pagination support

  // Priority 1: Date/Time Filters (Critical)
  receivedate: FdaDateRangeSchema,
  transmissiondate: FdaDateRangeSchema,
  receiptdate: FdaDateRangeSchema,

  // Priority 1: Patient Demographics (Critical)
  patient_sex: z.enum(['1', '2']).optional(), // 1=Male, 2=Female
  patient_age_group: z.enum(['1', '2', '3', '4', '5', '6']).optional(), // Age group codes
  patient_onset_age: z.string().optional(), // Age when event occurred
  patient_weight: z.string().optional(), // Patient weight

  // Priority 1: Severity/Outcome Filters (Critical)
  serious: z.enum(['1', '2']).optional(), // 1=serious, 2=non-serious
  seriousness_death: z.enum(['1']).optional(), // 1=resulted in death
  seriousness_hospitalization: z.enum(['1']).optional(), // 1=resulted in hospitalization
  seriousness_life_threatening: z.enum(['1']).optional(), // 1=life threatening
  seriousness_disabling: z.enum(['1']).optional(), // 1=resulted in disability
  seriousness_congenital_anomali: z.enum(['1']).optional(), // 1=congenital anomaly
  seriousness_other: z.enum(['1']).optional(), // 1=other serious

  // Priority 2: Drug-Specific Filters
  drug_medicinal_product: z.string().optional(), // Specific drug name
  drug_characterization: z.enum(['1', '2', '3']).optional(), // 1=Suspect, 2=Concomitant, 3=Interacting
  drug_indication: z.string().optional(), // Drug indication
  drug_administration_route: z.string().optional(), // Route of administration
  drug_start_date: FdaDateRangeSchema, // Drug start date range
  drug_end_date: FdaDateRangeSchema, // Drug end date range

  // Priority 2: OpenFDA Enhancement Fields
  openfda_brand_name: z.string().optional(), // Brand name search
  openfda_generic_name: z.string().optional(), // Generic name search
  openfda_manufacturer_name: z.string().optional(), // Manufacturer filter
  openfda_pharm_class_epc: z.string().optional(), // EPC pharmacologic class
  openfda_pharm_class_moa: z.string().optional(), // MOA pharmacologic class
  openfda_pharm_class_pe: z.string().optional(), // PE pharmacologic class
  openfda_pharm_class_cs: z.string().optional(), // Chemical structure class

  // Priority 2: Reaction-Specific Filters
  reaction_meddra_pt: z.string().optional(), // Specific reaction terms
  reaction_outcome: z.string().optional(), // Reaction outcome

  // Priority 3: Geographic Filters
  occur_country: z.string().optional(), // Country where event occurred
  primary_source_country: z.string().optional(), // Reporter's country

  // Priority 3: Report Metadata Filters
  safety_report_id: z.string().optional(), // Specific report ID
  report_type: z.string().optional(), // Type of report
  company_numb: z.string().optional(), // Company identifier
  fulfill_expedite_criteria: z.enum(['1']).optional(), // Expedited report flag

  // Field-specific parameters with validation
  fields_for_general: z.string().max(1000).optional(),
  fields_for_adverse_events: z.string().max(1000).optional(),
  fields_for_label: z.string().max(1000).optional(),
  fields_for_recalls: z.string().max(1000).optional(),
  fields_for_shortages: z.string().max(1000).optional(),
  fields_for_device_registration: z.string().max(1000).optional(),
  fields_for_device_pma: z.string().max(1000).optional(),
  fields_for_device_510k: z.string().max(1000).optional(),
  fields_for_device_udi: z.string().max(1000).optional(),
  fields_for_device_recalls: z.string().max(1000).optional(),
  fields_for_device_adverse_events: z.string().max(1000).optional(),
  fields_for_device_classification: z.string().max(1000).optional(),

  // Orange Book / Purple Book parameters
  drug_name: z.string().optional(), // For Orange/Purple Book searches
  nda_number: z.string().optional(), // For patent/exclusivity lookups
  bla_number: z.string().optional(), // For biologics lookups
  include_generics: z.boolean().optional(), // Include generic products
  years_ahead: z.number().int().min(1).max(20).optional(), // For patent cliff analysis
  reference_product: z.string().optional() // For biosimilar interchangeability
});

// ============================================================================
// Schema Validation Utilities
// ============================================================================

/**
 * Validate and transform data according to MCP schema
 */
export function validateMcpData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });

      return { success: false, errors };
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Schema validation failed${context ? ` in ${context}` : ''}: ${(error as Error).message}`]
    };
  }
}

/**
 * Create MCP-compliant error response
 */
export function createMcpErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): z.infer<typeof JsonRpcErrorResponseSchema> {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data
    },
    id
  };
}

/**
 * Create MCP-compliant success response
 */
export function createMcpSuccessResponse(
  id: string | number | null,
  result: unknown
): z.infer<typeof JsonRpcSuccessResponseSchema> {
  return {
    jsonrpc: '2.0',
    result,
    id
  };
}

// ============================================================================
// Schema Registry for Dynamic Validation
// ============================================================================

export const SchemaRegistry = {
  // Core MCP schemas
  string: McpStringSchema,
  number: McpNumberSchema,
  boolean: McpBooleanSchema,
  enum: McpEnumSchema,
  array: McpArraySchema,
  object: McpObjectSchema,

  // Resource schemas
  resource: McpResourceSchema,
  resourceUri: McpResourceUriSchema,
  resourceMetadata: McpResourceMetadataSchema,

  // Content schemas
  content: McpContentSchema,
  textContent: McpTextContentSchema,
  imageContent: McpImageContentSchema,
  audioContent: McpAudioContentSchema,
  embeddedResource: McpEmbeddedResourceSchema,

  // JSON-RPC schemas
  jsonRpcRequest: JsonRpcRequestSchema,
  jsonRpcResponse: JsonRpcResponseSchema,
  jsonRpcSuccess: JsonRpcSuccessResponseSchema,
  jsonRpcError: JsonRpcErrorResponseSchema,

  // Tool and prompt schemas
  tool: McpToolSchema,
  toolInput: McpToolInputSchema,
  prompt: McpPromptSchema,
  promptArgument: McpPromptArgumentSchema,

  // Server schemas
  serverCapabilities: McpServerCapabilitiesSchema,
  serverInfo: McpServerInfoSchema,

  // FDA-specific schemas
  fdaRequest: McpFdaRequestParamsSchema,
  fdaApiUrl: FdaApiUrlSchema,
  fdaSearchTerm: FdaSearchTermSchema,
  fdaLimit: FdaLimitSchema
} as const;