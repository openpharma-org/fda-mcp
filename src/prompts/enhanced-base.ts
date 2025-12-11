/**
 * Enhanced prompt base class with AI assistant execution guidance
 * Implements the AI Assistant Prompt Enhancement PRD specifications
 */

import { BasePrompt } from './base.js';
import { fieldValidator } from '../api/field-definitions.js';
import { FdaSearchType } from '../types/fda.js';

/**
 * Working example structure for AI assistant guidance
 */
export interface WorkingExample {
  name: string;
  description: string;
  query: {
    method: string;
    search_term: string;
    search_type: string;
    [key: string]: any;
  };
  expectedFields: string[];
  notes: string;
}

/**
 * Enhanced prompt structure for AI assistant execution
 */
export interface EnhancedPromptStructure {
  instructionHeader: string;        // IMPORTANT: Execute exactly...
  validationRules: string;          // Field validation rules
  errorPrevention: string;          // Common mistakes to avoid
  workingExamples: string[];        // Copy-paste examples
  executionProtocol: string;        // Step-by-step validation
  fieldReference: string;           // Valid fields list
  debuggingSteps: string;           // Error resolution guide
  promptContent: string;            // Original prompt logic
}

/**
 * Abstract enhanced prompt class with comprehensive AI assistant guidance
 */
export abstract class EnhancedPrompt<TParams = Record<string, unknown>> extends BasePrompt<TParams> {

  /**
   * Build enhanced prompt with all AI assistant guidance
   */
  protected buildEnhancedPrompt(
    basePrompt: string,
    searchType: FdaSearchType = 'general',
    examples: WorkingExample[] = []
  ): string {
    const validFields = fieldValidator.getValidFields(searchType);

    return `
${this.getInstructionHeader()}

${this.getValidationRules(validFields, searchType)}

${this.getErrorPrevention()}

${this.getWorkingExamples(examples)}

${this.getExecutionProtocol()}

${this.getFieldReference(validFields, searchType)}

${this.getDebuggingSteps()}

${basePrompt}
`;
  }

  /**
   * Critical execution instructions for AI assistants
   */
  private getInstructionHeader(): string {
    return `
🚨 IMPORTANT: Execute these queries EXACTLY as specified. Do not modify parameter names, field names, or syntax.

CRITICAL REQUIREMENTS:
- Copy-paste JSON examples without changes
- Validate all fields against FDA definitions before execution
- Test with limit=1 before running full queries
- Follow exact search term escaping rules
- Use only ONE field in fields_for_general parameter
`;
  }

  /**
   * Field validation rules specific to search type
   */
  private getValidationRules(validFields: string[], searchType: FdaSearchType): string {
    const validCountFields = this.getValidCountFields(searchType);
    const firstTenFields = validFields.slice(0, 10);

    return `
FIELD VALIDATION RULES FOR ${searchType.toUpperCase()}:
- fields_for_general accepts ONE field only (not comma-separated)
- count parameter must use exact field names from validation list
- All search terms with spaces must be quoted: "sponsor_name:\\"Company\\""
- Boolean operators require proper spacing: " AND ", " OR "

VALID COUNT FIELDS: ${validCountFields.join(', ')}
VALID ${searchType.toUpperCase()} FIELDS (first 10): ${firstTenFields.join(', ')}...
TOTAL VALID FIELDS: ${validFields.length} available
`;
  }

  /**
   * Common error patterns to prevent
   */
  private getErrorPrevention(): string {
    return `
COMMON MISTAKES TO AVOID:
❌ DON'T: "count": "sponsor_name.exact"
✅ DO: "count": "sponsor_name"

❌ DON'T: "fields_for_general": "sponsor_name,openfda.brand_name"
✅ DO: "fields_for_general": "sponsor_name"

❌ DON'T: "search_term": "sponsor_name:Lilly"
✅ DO: "search_term": "sponsor_name:\\"Lilly\\""

❌ DON'T: "search_term": "products.marketing_status:Prescription"
✅ DO: "search_term": "products.marketing_status:Prescription" (this one is correct)

❌ DON'T: Skip field validation
✅ DO: Check field exists in field-definitions.ts

❌ DON'T: Use .exact suffix in count parameters
✅ DO: Use base field names only
`;
  }

  /**
   * Working examples with copy-paste JSON
   */
  private getWorkingExamples(examples: WorkingExample[]): string {
    if (examples.length === 0) {
      return this.getDefaultExamples();
    }

    let examplesText = '\nWORKING EXAMPLES (copy exactly):\n';

    examples.forEach((example, index) => {
      examplesText += `
${index + 1}. ${example.name} - ${example.description}
   COPY THIS JSON:
   ${JSON.stringify(example.query, null, 2)}

   Expected fields: ${example.expectedFields.join(', ')}
   Notes: ${example.notes}
`;
    });

    return examplesText;
  }

  /**
   * Default working examples for general use
   */
  private getDefaultExamples(): string {
    return `
WORKING EXAMPLES (copy exactly):

1. Simple Drug Search
   COPY THIS JSON:
   {
     "method": "lookup_drug",
     "search_term": "aspirin",
     "search_type": "general",
     "limit": 5,
     "fields_for_general": "openfda.brand_name"
   }
   Notes: Basic drug search with single field

2. Company Search with Boolean Logic
   COPY THIS JSON:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:\\"PFIZER\\" AND products.marketing_status:Prescription",
     "search_type": "general",
     "limit": 10,
     "count": "application_number"
   }
   Notes: Company search with escaped quotes and count parameter

3. Marketing Status Count
   COPY THIS JSON:
   {
     "method": "lookup_drug",
     "search_term": "products.marketing_status:Prescription",
     "search_type": "general",
     "count": "sponsor_name",
     "limit": 15
   }
   Notes: Count query to get sponsor distribution
`;
  }

  /**
   * Step-by-step execution protocol
   */
  private getExecutionProtocol(): string {
    return `
EXECUTION PROTOCOL:
1. VALIDATE each query against FDA field definitions first
2. TEST with limit=1 if unsure about syntax
3. EXECUTE the full query only after validation passes
4. If any query fails, STOP and review field definitions
5. Reference src/api/field-definitions.ts for valid fields
6. Use exact JSON format from working examples

VALIDATION CHECKLIST:
□ Field name exists in getValidFields() for search type
□ Count parameter uses base field name (no .exact)
□ Search terms with company names are properly quoted
□ Only one field specified in fields_for_general
□ Boolean operators have proper spacing
□ Limit parameter is reasonable (1-50)
`;
  }

  /**
   * Field reference documentation
   */
  private getFieldReference(validFields: string[], searchType: FdaSearchType): string {
    const validCountFields = this.getValidCountFields(searchType);

    return `
FIELD REFERENCE FOR ${searchType.toUpperCase()} SEARCHES:

VALID COUNT FIELDS (use these exact names):
${validCountFields.map(field => `- ${field}`).join('\n')}

VALID fields_for_general OPTIONS (first 15):
${validFields.slice(0, 15).map(field => `- ${field}`).join('\n')}
... and ${Math.max(0, validFields.length - 15)} more

FIELD VALIDATION SOURCE:
- File: src/api/field-definitions.ts
- Method: getValidFields('${searchType}')
- Count fields: Base field names only, no .exact suffix
`;
  }

  /**
   * Debugging steps for common failures
   */
  private getDebuggingSteps(): string {
    return `
DEBUGGING STEPS FOR FAILURES:
1. "Invalid field" error → Check field exists in getDrugsFDAFields() array
2. "404 Not Found" error → Verify count parameter uses base field name
3. Syntax error → Check search term escaping and boolean operators
4. Empty results → Simplify search term, test with basic drug name
5. Validation error → Reference field-definitions.ts lines 59-112

TESTING APPROACH:
- Start with simple search: "search_term": "aspirin"
- Add complexity incrementally
- Validate each parameter before execution
- Use working examples as templates

ERROR RESOLUTION:
- Invalid field → Use exact field name from validation list
- 404 with count → Remove .exact suffix, use base name
- Syntax error → Check quotes around company names
- Empty results → Try broader search terms
- API timeout → Reduce limit parameter
`;
  }

  /**
   * Get valid count fields for the search type
   */
  protected getValidCountFields(searchType: FdaSearchType = 'general'): string[] {
    switch (searchType) {
      case 'general':
        return [
          'sponsor_name',
          'application_number',
          'openfda.brand_name',
          'openfda.generic_name',
          'openfda.manufacturer_name',
          'products.dosage_form',
          'products.marketing_status',
          'products.route'
        ];
      case 'adverse_events':
        return [
          'patient.drug.medicinalproduct',
          'patient.reaction.reactionmeddrapt',
          'patient.drug.drugcharacterization',
          'receivedate',
          'serious'
        ];
      case 'recalls':
        return [
          'classification',
          'status',
          'recalling_firm',
          'product_type'
        ];
      case 'shortages':
        return [
          'status',
          'therapeutic_category',
          'company_name'
        ];
      default:
        return ['sponsor_name', 'application_number'];
    }
  }

  /**
   * Abstract method for getting prompt-specific working examples
   */
  protected abstract getPromptSpecificExamples(): WorkingExample[];

  /**
   * Abstract method for getting the primary search type for this prompt
   */
  protected abstract getPrimarySearchType(): FdaSearchType;
}