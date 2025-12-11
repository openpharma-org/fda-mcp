/**
 * Enhanced FDA Regulatory Intelligence Prompt
 * Implements AI Assistant Prompt Enhancement PRD specifications
 * Comprehensive FDA regulatory intelligence analysis combining approval timeline,
 * safety surveillance, recent regulatory activity, and supply chain status
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { RegulatoryIntelArgsSchema, FdaSearchType } from '../types/fda.js';

interface RegulatoryIntelArgs {
  drug_name?: string;
  company_name?: string;
}

export class RegulatoryIntelPrompt extends EnhancedPrompt<RegulatoryIntelArgs> {
  constructor() {
    super(
      'fda_regulatory_due_diligence',
      'Comprehensive regulatory intelligence analysis using FDA databases by brand name or company name. Analyzes originator identification, safety surveillance, demographic risks, regulatory timeline, and supply chain assessment for pharmaceutical regulatory analysis.',
      {
        drug_name: (RegulatoryIntelArgsSchema.innerType() as any).shape.drug_name.describe('Name of the drug to analyze (Brand name)'),
        company_name: (RegulatoryIntelArgsSchema.innerType() as any).shape.company_name.describe('Name of the company to analyze')
      }
    );
  }

  protected async execute(
    params: RegulatoryIntelArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { drug_name, company_name } = params;

    // Use placeholders if not provided
    const brandName = drug_name || '[BRAND_NAME]';
    const genericName = drug_name || '[GENERIC_NAME]';
    const applicationNumber = '[APPLICATION_NUMBER]';

    // Base prompt content with optimized 5-query framework from fda-guide.md
    const basePrompt = `Analyze regulatory intelligence for ${drug_name || company_name} with these optimized queries:

1. Originator identification and brand positioning:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "products.brand_name:${brandName}",
     "search_type": "general",
     "count": "sponsor_name",
     "limit": 1
   }

2. Safety surveillance profile from adverse events:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${genericName}",
     "search_type": "adverse_events",
     "count": "patient.reaction.reactionmeddrapt.exact",
     "limit": 15
   }

3. Serious adverse events by demographics:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${genericName} AND serious:1",
     "search_type": "adverse_events",
     "count": "patient.patientsex",
     "limit": 15
   }

4. Complete regulatory timeline and activity patterns:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "application_number:${applicationNumber}",
     "search_type": "general",
     "count": "submissions.submission_status_date",
     "limit": 15
   }

5. Supply chain risk assessment:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "generic_name:${genericName}",
     "search_type": "shortages",
     "count": "status",
     "limit": 15
   }

**Token-Optimized Analysis Framework:**
- **Safety surveillance**: Top adverse events, serious event patterns, demographic risks
- **Regulatory momentum**: Complete chronological timeline
- **Supply security**: Immediate shortage status assessment

**Output Format:**
1. **Current Regulatory Status** (1 paragraph + 3 bullets): Overall regulatory standing and originator information
2. **Regulatory Timeline** (table): Key approval milestones and submission history
3. **Safety Profile** (3 bullets): Top adverse events, serious event rates, risk demographics

Execute each query sequentially and provide comprehensive regulatory intelligence covering originator identification, safety surveillance, regulatory timeline, and supply chain assessment for pharmaceutical regulatory analysis.`;

    // Create simplified prompt with schema reference
    const simplifiedPrompt = `EXECUTE EXACTLY: Use the fda_info tool with the provided JSON parameters below.

SCHEMA REFERENCE:
- Use the fda_info tool schema parameters: method, search_term, search_type, count, limit
- For field validation, check the tool's built-in schema validation
- Available search_type options: "general", "label", "adverse_events", "recalls", "shortages"
- count parameter accepts field names from the FDA database
- fields_for_general accepts comma-separated field names for targeted searches
- fields_for_adverse_events accepts single field names for targeted searches
- fields_for_shortages accepts comma-separated field names for targeted shortage searches

${basePrompt}`;

    return this.createPromptResult(
      `Regulatory Intelligence Analysis for ${drug_name || company_name}`,
      simplifiedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for regulatory intelligence
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Originator Identification",
        description: "Identify drug originator company using count query",
        query: {
          method: "lookup_drug",
          search_term: "products.brand_name:HUMIRA",
          search_type: "general",
          count: "sponsor_name",
          limit: 1
        },
        expectedFields: ["sponsor_name"],
        notes: "Count query provides instant originator identification with 95% token reduction"
      },
      {
        name: "Safety Surveillance Profile",
        description: "Get top adverse reactions using count query",
        query: {
          method: "lookup_drug",
          search_term: "patient.drug.medicinalproduct:adalimumab",
          search_type: "adverse_events",
          count: "patient.reaction.reactionmeddrapt.exact",
          limit: 8
        },
        expectedFields: ["patient.reaction.reactionmeddrapt"],
        notes: "Top adverse reactions with frequency counts for safety assessment"
      },
      {
        name: "Regulatory Timeline Analysis",
        description: "Get complete submission timeline using count query",
        query: {
          method: "lookup_drug",
          search_term: "application_number:BLA125057",
          search_type: "general",
          count: "submissions.submission_status_date",
          limit: 10
        },
        expectedFields: ["submissions.submission_status_date"],
        notes: "Complete chronological timeline (2002-2025) with 90% token reduction"
      },
      {
        name: "Supply Chain Risk Assessment",
        description: "Analyze shortage status distribution",
        query: {
          method: "lookup_drug",
          search_term: "generic_name:adalimumab",
          search_type: "shortages",
          count: "status",
          limit: 5
        },
        expectedFields: ["status"],
        notes: "Immediate shortage status assessment with 85% token reduction"
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