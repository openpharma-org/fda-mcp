/**
 * FDA API specific types and interfaces
 */

import { z } from 'zod';

// ============================================================================
// FDA API Method Types
// ============================================================================

export type FdaMethod = 'lookup_drug' | 'lookup_device';

export type FdaSearchType =
  | 'general'
  | 'label'
  | 'adverse_events'
  | 'recalls'
  | 'shortages'
  | 'substance'
  | 'device_registration'
  | 'device_pma'
  | 'device_510k'
  | 'device_udi'
  | 'device_recalls'
  | 'device_adverse_events'
  | 'device_classification';

// ============================================================================
// FDA Request Parameters
// ============================================================================

export interface FdaRequestParams {
  method: FdaMethod;
  search_term: string;
  search_type?: FdaSearchType;
  limit?: number;
  count?: string;
  pharm_class?: string;
  field_exists?: string;

  // Field-specific parameters
  fields_for_general?: string;
  fields_for_adverse_events?: string;
  fields_for_label?: string;
  fields_for_recalls?: string;
  fields_for_shortages?: string;
  fields_for_substance?: string;
  fields_for_device_registration?: string;
  fields_for_device_pma?: string;
  fields_for_device_510k?: string;
  fields_for_device_udi?: string;
  fields_for_device_recalls?: string;
  fields_for_device_adverse_events?: string;
  fields_for_device_classification?: string;
}

// ============================================================================
// FDA Response Types
// ============================================================================

export interface FdaSubmission {
  submission_type: string;
  submission_number: string;
  submission_status: string;
  submission_status_date: string;
  review_priority?: string;
  submission_class_code?: string;
  submission_class_code_description?: string;
  submission_public_notes?: string;
  application_docs?: Array<{
    id: string;
    url: string;
    date: string;
    type: string;
  }>;
}

export interface FdaProduct {
  product_number: string;
  reference_drug: string;
  brand_name: string;
  active_ingredients: Array<{
    name: string;
    strength: string;
  }>;
  reference_standard: string;
  dosage_form: string;
  route: string;
  marketing_status: string;
  te_code?: string;
}

export interface FdaOpenData {
  application_number?: string[];
  brand_name?: string[];
  generic_name?: string[];
  manufacturer_name?: string[];
  product_ndc?: string[];
  product_type?: string[];
  route?: string[];
  substance_name?: string[];
  rxcui?: string[];
  spl_id?: string[];
  spl_set_id?: string[];
  package_ndc?: string[];
  nui?: string[];
  pharm_class_moa?: string[];
  pharm_class_pe?: string[];
  pharm_class_cs?: string[];
  pharm_class_epc?: string[];
  unii?: string[];
}

export interface FdaDrugRecord {
  submissions: FdaSubmission[];
  application_number: string;
  sponsor_name: string;
  openfda?: FdaOpenData;
  products: FdaProduct[];
}

export interface FdaResponse {
  success: boolean;
  query: string;
  search_type: string;
  total_results: number;
  results: FdaDrugRecord[];
  metadata: {
    total: number;
    skip: number;
    limit: number;
  };
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const FdaMethodSchema = z.enum(['lookup_drug', 'lookup_device']);

export const FdaSearchTypeSchema = z.enum([
  'general',
  'label',
  'adverse_events',
  'recalls',
  'shortages',
  'substance',
  'device_registration',
  'device_pma',
  'device_510k',
  'device_udi',
  'device_recalls',
  'device_adverse_events',
  'device_classification'
]);

export const FdaRequestParamsSchema = z.object({
  method: FdaMethodSchema,
  search_term: z.string().min(1, 'Search term is required'),
  search_type: FdaSearchTypeSchema.default('general'),
  limit: z.number().min(1).default(10), // Note: FDA API enforces max 100, but we let it return natural error
  count: z.string().optional(),
  pharm_class: z.string().optional(),
  field_exists: z.string().optional(),

  // Field-specific parameters
  fields_for_general: z.string().optional(),
  fields_for_adverse_events: z.string().optional(),
  fields_for_label: z.string().optional(),
  fields_for_recalls: z.string().optional(),
  fields_for_shortages: z.string().optional(),
  fields_for_substance: z.string().optional(),
  fields_for_device_registration: z.string().optional(),
  fields_for_device_pma: z.string().optional(),
  fields_for_device_510k: z.string().optional(),
  fields_for_device_udi: z.string().optional(),
  fields_for_device_recalls: z.string().optional(),
  fields_for_device_adverse_events: z.string().optional(),
  fields_for_device_classification: z.string().optional()
});

// ============================================================================
// Prompt Argument Schemas
// ============================================================================

export const DrugNameSchema = z.string().min(1, 'Drug name is required');
export const CompanyNameSchema = z.string().min(1, 'Company name is required');
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const DrugSafetyArgsSchema = z.object({
  drug_name: DrugNameSchema
});

export const CompetitiveIntelArgsSchema = z.object({
  company_name: CompanyNameSchema
});

export const GenericCompetitionArgsSchema = z.object({
  brand_drug: z.string().optional(),
  generic_name: z.string().optional()
}).refine(data => data.brand_drug || data.generic_name, {
  message: 'Either brand_drug or generic_name must be provided'
});

export const SupplyChainArgsSchema = z.object({
  drug_name: z.string().optional(),
  therapeutic_area: z.string().optional()
}).refine(data => data.drug_name || data.therapeutic_area, {
  message: 'Either drug_name or therapeutic_area must be provided'
});

export const RegulatoryIntelArgsSchema = z.object({
  drug_name: z.string().optional(),
  company_name: z.string().optional()
}).refine(data => data.drug_name || data.company_name, {
  message: 'Either drug_name or company_name must be provided'
});

export const MonitoringArgsSchema = z.object({
  target_entity: z.string().min(1, 'Target entity is required'),
  current_date: DateSchema
});

export const MarketIntelArgsSchema = z.object({
  drug_name: z.string().optional(),
  company_name: z.string().optional()
}).refine(data => data.drug_name || data.company_name, {
  message: 'Either drug_name or company_name must be provided'
});

