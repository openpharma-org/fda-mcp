/**
 * Enhanced Supply Chain Intelligence Prompt for FDA MCP Server
 * Implements AI Assistant Prompt Enhancement PRD specifications
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { SupplyChainArgsSchema, FdaSearchType } from '../types/fda.js';

interface SupplyChainArgs {
  drug_name?: string;
  therapeutic_area?: string;
}

export class SupplyChainPrompt extends EnhancedPrompt<SupplyChainArgs> {
  constructor() {
    super(
      'fda_supply_chain_risk_assessment',
      'Supply Chain Risk Assessment for drug manufacturing and availability. Analyzes current shortages, therapeutic vulnerability patterns, supplier concentration risks, manufacturing resilience, and discontinuation risks.',
      {
        drug_name: (SupplyChainArgsSchema.innerType() as any).shape.drug_name.describe('Name of the drug to analyze for supply chain risks (provide either drug_name or therapeutic_area)'),
        therapeutic_area: (SupplyChainArgsSchema.innerType() as any).shape.therapeutic_area.describe('Therapeutic area to analyze for supply chain risks (provide either drug_name or therapeutic_area)')
      }
    );
  }

  protected async execute(
    params: SupplyChainArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { drug_name, therapeutic_area } = params;

    // Use placeholders if not provided
    const therapeuticAreaName = therapeutic_area || '[THERAPEUTIC_AREA]';
    const genericName = drug_name || '[GENERIC_NAME]';

    // Base prompt content with optimized 5-query framework from fda-guide.md
    const basePrompt = `Analyze supply chain risks for ${drug_name || therapeutic_area} with these optimized queries:

1. Active shortages in therapeutic area:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "therapeutic_category:${therapeuticAreaName}",
     "search_type": "shortages",
     "limit": 5,
     "fields_for_shortages": "generic_name,company_name,status,shortage_reason"
   }

2. Shortage patterns by therapeutic category:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "status:Current",
     "search_type": "shortages",
     "count": "therapeutic_category",
     "limit": 8
   }

3. Market concentration risk for specific drugs:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericName} AND products.marketing_status:Prescription",
     "count": "sponsor_name",
     "limit": 5
   }

4. Manufacturing diversity for drug formulations:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:${genericName} AND products.marketing_status:Prescription",
     "limit": 3,
     "fields_for_general": "sponsor_name,products.dosage_form,products.route"
   }

5. Upcoming supply exits (discontinuation risk):
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "discontinued_date:*",
     "search_type": "shortages",
     "limit": 3,
     "fields_for_shortages": "generic_name,company_name,discontinued_date"
   }

**Critical Parameter Findings:**
- **Therapeutic categories are case-sensitive**: Use "Oncology", "Pediatric", "Cardiovascular" (not "oncology" or "ONCOLOGY")
- **Shortage wildcards don't work**: Use \`status:Current\` instead of \`search_term="*"\` for general patterns
- **Quote complex status values**: Use \`status:"To Be Discontinued"\` (with quotes) for multi-word statuses

**Analysis Framework:**
- Active disruptions: Current shortages and their root causes
- Therapeutic vulnerability: Categories most prone to shortages
- Supply concentration: Single vs multi-supplier dependency
- Manufacturing resilience: Formulation and delivery redundancy

**Output Format:**
1. **Current Supply Status** (3 bullets): Active shortages, primary causes, affected categories
2. **Risk Assessment** (table): Supplier concentration and vulnerability metrics
3. **Mitigation Strategy** (1 paragraph): Supply chain diversification and contingency recommendations

Execute each query sequentially and provide comprehensive supply chain intelligence with shortage analysis, market concentration assessment, and strategic risk mitigation recommendations.`;

    // Create simplified prompt with schema reference
    const simplifiedPrompt = `🚨 EXECUTE EXACTLY: Use the fda_info tool with the provided JSON parameters below.

📋 SCHEMA REFERENCE:
- Use the fda_info tool schema parameters: method, search_term, search_type, count, limit
- For field validation, check the tool's built-in schema validation
- Available search_type options: "general", "label", "adverse_events", "recalls", "shortages"
- count parameter accepts field names from the FDA database
- fields_for_shortages accepts comma-separated field names for targeted shortage searches
- fields_for_general accepts comma-separated field names for targeted general searches

${basePrompt}`;

    return this.createPromptResult(
      `Supply Chain Risk Assessment for ${drug_name || therapeutic_area}`,
      simplifiedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for supply chain analysis
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Active Shortages in Therapeutic Area",
        description: "Find current shortages with comprehensive details",
        query: {
          method: "lookup_drug",
          search_term: "therapeutic_category:Oncology",
          search_type: "shortages",
          limit: 5,
          fields_for_shortages: "generic_name,company_name,status,shortage_reason"
        },
        expectedFields: ["generic_name", "company_name", "status", "shortage_reason"],
        notes: "Therapeutic categories are case-sensitive: use proper case"
      },
      {
        name: "Shortage Patterns by Category",
        description: "Count which therapeutic areas have most shortages",
        query: {
          method: "lookup_drug",
          search_term: "status:Current",
          search_type: "shortages",
          count: "therapeutic_category",
          limit: 8
        },
        expectedFields: ["therapeutic_category"],
        notes: "Use status:Current to filter for active shortages only"
      },
      {
        name: "Market Concentration Risk",
        description: "Count manufacturers supplying a specific drug",
        query: {
          method: "lookup_drug",
          search_term: "openfda.generic_name:adalimumab AND products.marketing_status:Prescription",
          search_type: "general",
          count: "sponsor_name",
          limit: 5
        },
        expectedFields: ["sponsor_name"],
        notes: "Fewer sponsors = higher concentration risk and shortage vulnerability"
      },
      {
        name: "Upcoming Supply Exits",
        description: "Find drugs with discontinuation dates",
        query: {
          method: "lookup_drug",
          search_term: "discontinued_date:*",
          search_type: "shortages",
          limit: 3,
          fields_for_shortages: "generic_name,company_name,discontinued_date"
        },
        expectedFields: ["generic_name", "company_name", "discontinued_date"],
        notes: "Provides actual discontinuation timeline with dates and companies"
      }
    ];
  }

  /**
   * Get the primary search type for this prompt
   */
  protected getPrimarySearchType(): FdaSearchType {
    return 'shortages';
  }
}