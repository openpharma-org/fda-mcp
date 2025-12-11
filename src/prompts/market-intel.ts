/**
 * Enhanced FDA Market Intelligence Prompt
 * Implements AI Assistant Prompt Enhancement PRD specifications
 * FDA-focused market intelligence analysis including patent protection timelines,
 * generic competition risks, and regulatory pathway impacts on market access
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { FdaSearchType } from '../types/fda.js';
import { z } from 'zod';

interface MarketIntelArgs {
  drug_name?: string;
  company_name?: string;
  brand_name?: string;
  generic_name?: string;
  nda_number?: string;
}

export class MarketIntelPrompt extends EnhancedPrompt<MarketIntelArgs> {
  constructor() {
    super(
      'fda_market_access_analysis',
      'FDA-focused market intelligence analysis including patent protection timelines, generic competition risks, and regulatory pathway impacts on market access for investment decision-making.',
      {
        drug_name: z.string().optional().describe('Name of the drug to analyze for market intelligence'),
        company_name: z.string().optional().describe('Name of the company to analyze for market intelligence'),
        brand_name: z.string().optional().describe('Brand name of the drug for market analysis'),
        generic_name: z.string().optional().describe('Generic name of the drug for market analysis'),
        nda_number: z.string().optional().describe('NDA/BLA application number for market analysis')
      }
    );
  }

  protected async execute(
    params: MarketIntelArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { drug_name, company_name, brand_name, generic_name, nda_number } = params;

    // Use placeholders if not provided
    const companyName = company_name || '[COMPANY_NAME]';
    const brandName = brand_name || '[BRAND_NAME]';
    const genericName = generic_name || '[GENERIC_NAME]';
    const ndaNumber = nda_number || '[NDA_NUMBER]';
    const searchEntity = drug_name || company_name || brandName;

    // Base prompt content with corrected queries
    const basePrompt = `Generate FDA-focused market intelligence for ${searchEntity}:

1. Company portfolio marketing status distribution:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:\\"${companyName}\\"",
     "search_type": "general",
     "count": "products.marketing_status",
     "limit": 15
   }

2. Company regulatory submission activity:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:\\"${companyName}\\"",
     "search_type": "general",
     "count": "submissions.submission_type",
     "limit": 10
   }

3. Application number and therapeutic equivalence:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "application_number:\\"${ndaNumber}\\"",
     "search_type": "general",
     "limit": 1,
     "fields_for_general": "application_number"
   }

4. Therapeutic equivalence code analysis:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "application_number:\\"${ndaNumber}\\"",
     "search_type": "general",
     "limit": 1,
     "fields_for_general": "products.te_code"
   }

5. Brand and generic name mapping:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "application_number:\\"${ndaNumber}\\"",
     "search_type": "general",
     "limit": 1,
     "fields_for_general": "openfda.brand_name"
   }

6. Generic name verification:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "application_number:\\"${ndaNumber}\\"",
     "search_type": "general",
     "limit": 1,
     "fields_for_general": "openfda.generic_name"
   }

7. Generic competition landscape:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.generic_name:\\"${genericName}\\" AND products.marketing_status:Prescription",
     "search_type": "general",
     "count": "sponsor_name",
     "limit": 10
   }

8. Submission class codes for regulatory pathway:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "products.brand_name:\\"${brandName}\\"",
     "search_type": "general",
     "limit": 5,
     "fields_for_general": "submissions.submission_class_code"
   }

9. Submission status timeline:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "products.brand_name:\\"${brandName}\\"",
     "search_type": "general",
     "limit": 5,
     "fields_for_general": "submissions.submission_status"
   }

10. Current marketing status verification:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "products.brand_name:\\"${brandName}\\"",
      "search_type": "general",
      "limit": 1,
      "fields_for_general": "products.marketing_status"
    }

**Analysis Framework (FDA-adapted):**
- Portfolio strength: Product count, marketing status distribution, submission activity
- Regulatory momentum: Submission types, approval pathway efficiency, recent activity
- Patent cliff analysis: Exclusivity timeline, generic entry risk, therapeutic equivalence codes
- Market positioning: Regulatory advantages, breakthrough designations, competitive moats
- Investment thesis: Risk-adjusted projections, catalyst timeline, downside protection

**Field Interpretation:**
- Marketing status: Prescription (active), Discontinued (off-market), OTC (over-counter)
- TE codes: AB (therapeutically equivalent), AP (pharmaceutical equivalent), etc.
- Submission types: Original NDA/BLA, Supplement, Amendment, Resubmission
- Submission class: Priority, Standard, Fast Track, Breakthrough Therapy

**Output Format:**
1. **Portfolio Overview** (table): Product count, marketing status, regulatory activity
2. **Competitive Moats** (3 bullets): Patent protection, regulatory barriers, market positioning
3. **Generic Competition Risk** (2 bullets): Current competitors, entry barriers
4. **Investment Thesis** (1 paragraph): Risk-adjusted projections with catalyst timeline and key risks

Execute each query sequentially and provide comprehensive FDA-focused market intelligence for investment decision-making combining regulatory pathway analysis, generic competition assessment, and patent protection evaluation.`;

    // Build enhanced prompt with AI assistant guidance
    const enhancedPrompt = this.buildEnhancedPrompt(
      basePrompt,
      this.getPrimarySearchType(),
      this.getPromptSpecificExamples()
    );

    return this.createPromptResult(
      `Enhanced FDA Market Intelligence for ${searchEntity}`,
      enhancedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for market intelligence
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Company Portfolio Analysis",
        description: "Analyze company's product marketing status distribution",
        query: {
          method: "lookup_drug",
          search_term: "sponsor_name:\"PFIZER\"",
          search_type: "general",
          count: "products.marketing_status",
          limit: 15
        },
        expectedFields: ["products.marketing_status"],
        notes: "Shows portfolio health: Prescription vs Discontinued products"
      },
      {
        name: "Regulatory Submission Activity",
        description: "Assess company's regulatory pipeline and activity",
        query: {
          method: "lookup_drug",
          search_term: "sponsor_name:\"PFIZER\"",
          search_type: "general",
          count: "submissions.submission_type",
          limit: 10
        },
        expectedFields: ["submissions.submission_type"],
        notes: "Indicates R&D momentum and regulatory engagement"
      },
      {
        name: "Generic Competition Landscape",
        description: "Count competitors in the same therapeutic area",
        query: {
          method: "lookup_drug",
          search_term: "openfda.generic_name:\"atorvastatin\" AND products.marketing_status:Prescription",
          search_type: "general",
          count: "sponsor_name",
          limit: 10
        },
        expectedFields: ["sponsor_name"],
        notes: "Market concentration risk: fewer sponsors = higher market power"
      },
      {
        name: "Therapeutic Equivalence Analysis",
        description: "Check drug's therapeutic equivalence rating",
        query: {
          method: "lookup_drug",
          search_term: "products.brand_name:\"LIPITOR\"",
          search_type: "general",
          limit: 1,
          fields_for_general: "products.te_code"
        },
        expectedFields: ["products.te_code"],
        notes: "TE codes indicate generic substitution potential and competitive protection"
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