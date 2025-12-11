/**
 * Enhanced Competitive Intelligence Prompt for FDA MCP Server
 * Implements AI Assistant Prompt Enhancement PRD specifications
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { CompetitiveIntelArgsSchema, FdaSearchType } from '../types/fda.js';

interface CompetitiveIntelArgs {
  company_name: string;
}

export class CompetitiveIntelPrompt extends EnhancedPrompt<CompetitiveIntelArgs> {
  constructor() {
    super(
      'fda_company_portfolio_analysis',
      'Generate competitive intelligence reports analyzing company drug portfolios, market positions, and regulatory activities for pharmaceutical market analysis.',
      {
        company_name: CompetitiveIntelArgsSchema.shape.company_name.describe('Name of the pharmaceutical company to analyze')
      }
    );
  }

  protected async execute(
    params: CompetitiveIntelArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { company_name } = params;

    // Base prompt content with tested and optimized queries
    const basePrompt = `Analyze ${company_name} competitive position with these strategic queries:

1. Company's position among pharmaceutical competitors with active prescription products:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:${company_name} AND products.marketing_status:Prescription",
     "count": "application_number",
     "limit": 15
   }

2. Company's top active prescription brands and generic names:
   - Brand analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:${company_name} AND products.marketing_status:Prescription",
     "count": "openfda.brand_name.exact"
   }

   - Generic analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:${company_name} AND products.marketing_status:Prescription",
     "count": "openfda.generic_name.exact"
   }

3. Company's formulation specializations and delivery methods:
   - Route analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.manufacturer_name:${company_name}",
     "count": "openfda.route.exact"
   }

   - Dosage form analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.manufacturer_name:${company_name}",
     "count": "products.dosage_form.exact"
   }

4. Company's complete regulatory submissions:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:${company_name}",
     "count": "submissions.submission_status_date",
     "limit": 1
   }

notes:
- Portfolio strength: Active prescription drugs vs discontinued products
- Regulatory momentum: Recent approvals/submissions in past 2 years
- Competitive focus: Dosage form specialization and therapeutic class concentration

Output Format:
1. Market Position (1 paragraph): Company's position, relative size, competitive tier
2. Full Portfolio (table): All products with status and approval dates and all
3. Strategic Assessment (2 paragraphs): Regulatory activity, dosage focus, competitive advantages

Execute each query sequentially and provide comprehensive competitive intelligence covering market positioning, portfolio analysis, and strategic assessment for pharmaceutical competitive analysis.`;

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
      `Pharmaceutical Competitive Intelligence Report for ${company_name}`,
      simplifiedPrompt
    );
  }

  /**
   * Get prompt-specific working examples
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Company Application Count",
        description: "Count company's prescription drug applications",
        query: {
          method: "lookup_drug",
          search_term: "sponsor_name:PFIZER AND products.marketing_status:Prescription",
          search_type: "general",
          count: "application_number",
          limit: 15
        },
        expectedFields: ["application_number"],
        notes: "Shows company's active prescription drug portfolio size"
      },
      {
        name: "Brand Names Analysis",
        description: "Get company's brand names using count query",
        query: {
          method: "lookup_drug",
          search_term: "sponsor_name:PFIZER AND products.marketing_status:Prescription",
          search_type: "general",
          count: "openfda.brand_name.exact"
        },
        expectedFields: ["openfda.brand_name"],
        notes: "Count query provides brand name distribution efficiently"
      },
      {
        name: "Route Specialization",
        description: "Analyze company's delivery route focus",
        query: {
          method: "lookup_drug",
          search_term: "openfda.manufacturer_name:PFIZER",
          search_type: "general",
          count: "openfda.route.exact"
        },
        expectedFields: ["openfda.route"],
        notes: "Shows expertise in specific delivery methods (subcutaneous, oral, etc.)"
      },
      {
        name: "Regulatory Timeline",
        description: "Get complete regulatory submission timeline",
        query: {
          method: "lookup_drug",
          search_term: "sponsor_name:PFIZER",
          search_type: "general",
          count: "submissions.submission_status_date",
          limit: 1
        },
        expectedFields: ["submissions.submission_status_date"],
        notes: "Optimized query for 95% token reduction while maintaining full timeline intelligence"
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