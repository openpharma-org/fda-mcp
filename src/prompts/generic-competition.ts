/**
 * Enhanced Generic Competition Assessment Prompt
 * Implements AI Assistant Prompt Enhancement PRD specifications
 * Comprehensive generic competition assessment for Orange Book FDA analysis
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { GenericCompetitionArgsSchema, FdaSearchType } from '../types/fda.js';

interface GenericCompetitionArgs {
  brand_drug?: string;
  generic_name?: string;
}

export class GenericCompetitionPrompt extends EnhancedPrompt<GenericCompetitionArgs> {
  constructor() {
    super(
      'fda_generic_competition_landscape',
      'Comprehensive generic competition assessment for Orange Book FDA analysis. Evaluates market entry patterns, competitive landscape, reference vs generic drug distinction, and market maturity indicators.',
      {
        brand_drug: (GenericCompetitionArgsSchema.innerType() as any).shape.brand_drug.describe('Brand name of the drug to analyze for generic competition (provide either brand_drug or generic_name)'),
        generic_name: (GenericCompetitionArgsSchema.innerType() as any).shape.generic_name.describe('Generic name of the drug to analyze for generic competition (provide either brand_drug or generic_name)')
      }
    );
  }

  protected async execute(
    params: GenericCompetitionArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { brand_drug, generic_name } = params;

    // For the prompt, we need both brand drug and generic name placeholders
    const brandDrugName = brand_drug || '[BRAND_DRUG]';
    const genericDrugName = generic_name || '[GENERIC_NAME]';

    // Base prompt content with optimized 5-query framework from fda-guide.md
    const basePrompt = `Assess generic competition for ${brandDrugName} with these optimized queries:

1. Brand drug details and originator sponsor:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "products.brand_name:${brandDrugName} OR openfda.generic_name:${genericDrugName}",
     "limit": 1,
     "fields_for_general": "openfda.brand_name"
   }

2. Total competitive landscape:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericDrugName} AND products.marketing_status:Prescription",
     "count": "sponsor_name",
     "limit": 15
   }

3. Reference vs generic distinction:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericDrugName} AND products.marketing_status:Prescription",
     "count": "products.reference_drug",
     "limit": 15
   }

4. Latest generic entries:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericDrugName} AND products.reference_drug:No",
     "count": "sponsor_name",
     "limit": 15
   }

5. Market timeline efficiency:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericDrugName} AND products.marketing_status:Prescription",
     "count": "submissions.submission_status_date",
     "limit": 15
   }

notes:
- Focus on statistical patterns for competitive positioning analysis

**Output Format:**
1. **Competition Status** (1 short paragraph): Total manufacturers, originator vs generics, market maturity + Full list of manufacturers (table): just the name of each manufacturer indicating the originator
2. **Competitive Timeline** (table): Shows Market entry progression over time
3. **Market Assessment** (2 paragraphs): Competition intensity, recent entries, strategic implications

Execute each query sequentially and provide comprehensive Orange Book FDA analysis covering market entry patterns, competitive landscape, and market maturity indicators.`;

    // Create simplified prompt with schema reference
    const simplifiedPrompt = `EXECUTE EXACTLY: Use the fda_info tool with the provided JSON parameters below.

SCHEMA REFERENCE:
- Use the fda_info tool schema parameters: method, search_term, search_type, count, limit
- For field validation, check the tool's built-in schema validation
- Available search_type options: "general", "label", "adverse_events", "recalls", "shortages"
- count parameter accepts field names from the FDA database
- fields_for_general accepts single field names for targeted searches

${basePrompt}`;

    return this.createPromptResult(
      `Orange Book FDA Generic Competition Assessment for ${brandDrugName}`,
      simplifiedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for generic competition analysis
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Brand Drug Details",
        description: "Get brand drug details and originator information",
        query: {
          method: "lookup_drug",
          search_term: "products.brand_name:HUMIRA OR openfda.generic_name:adalimumab",
          search_type: "general",
          limit: 1,
          fields_for_general: "openfda.brand_name"
        },
        expectedFields: ["openfda.brand_name"],
        notes: "Identifies brand drug and originator information"
      },
      {
        name: "Total Competitive Landscape",
        description: "Count all sponsors manufacturing the generic drug",
        query: {
          method: "lookup_drug",
          search_term: "openfda.generic_name:adalimumab AND products.marketing_status:Prescription",
          search_type: "general",
          count: "sponsor_name",
          limit: 8
        },
        expectedFields: ["sponsor_name"],
        notes: "Shows competitive intensity: more sponsors = higher competition"
      },
      {
        name: "Reference vs Generic Distinction",
        description: "Count reference vs generic drug classification",
        query: {
          method: "lookup_drug",
          search_term: "openfda.generic_name:adalimumab AND products.marketing_status:Prescription",
          search_type: "general",
          count: "products.reference_drug",
          limit: 3
        },
        expectedFields: ["products.reference_drug"],
        notes: "Count query provides instant market maturity assessment"
      },
      {
        name: "Market Timeline Efficiency",
        description: "Get application numbers for timeline analysis",
        query: {
          method: "lookup_drug",
          search_term: "openfda.generic_name:adalimumab AND products.marketing_status:Prescription",
          search_type: "general",
          count: "application_number",
          limit: 3
        },
        expectedFields: ["application_number"],
        notes: "Efficient timeline data using application number counts for market entry patterns"
      }
    ];
  }

  /**
   * Get the primary search type for this prompt
   */
  protected getPrimarySearchType(): FdaSearchType {
    return 'general';
  }
}