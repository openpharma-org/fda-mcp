/**
 * Enhanced Drug Safety Intelligence Prompt for FDA MCP Server
 * Implements AI Assistant Prompt Enhancement PRD specifications
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { DrugSafetyArgsSchema, FdaSearchType } from '../types/fda.js';

interface DrugSafetyArgs {
  drug_name: string;
}

export class DrugSafetyPrompt extends EnhancedPrompt<DrugSafetyArgs> {
  constructor() {
    super(
      'fda_drug_safety_profile',
      'Comprehensive drug safety analysis using FDA adverse events data (FAERS database). Analyzes safety profile with total reports, top reactions, serious events by demographics, and age patterns for deaths.',
      {
        drug_name: DrugSafetyArgsSchema.shape.drug_name.describe('Name of the drug to analyze (generic or brand name)')
      }
    );
  }

  protected async execute(
    params: DrugSafetyArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { drug_name } = params;

    // Base prompt content for drug safety analysis
    const basePrompt = `Analyze ${drug_name} safety profile with these strategic queries:

1. Total reports breakdown for ${drug_name}:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${drug_name}",
     "search_type": "adverse_events",
     "count": "serious",
     "limit": 2
   }

2. Top adverse reactions reported for ${drug_name}:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${drug_name}",
     "search_type": "adverse_events",
     "count": "patient.reaction.reactionmeddrapt.exact",
     "limit": 10
   }

3. Serious events by gender for ${drug_name}:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${drug_name} AND serious:1",
     "search_type": "adverse_events",
     "count": "patient.patientsex",
     "limit": 3
   }

4. Death age patterns for ${drug_name}:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "patient.drug.medicinalproduct:${drug_name} AND seriousnessdeath:1",
     "search_type": "adverse_events",
     "count": "patient.patientonsetage",
     "limit": 5
   }

notes:
- Sex codes (1=male, 2=female, 0=unknown)
- Focus on count statistics, not individual cases
- Optimized limits for 90% token reduction while maintaining comprehensive safety intelligence

**Output Format:**
1. **Safety Overview** (1 paragraph + 2 bullets): Overall safety assessment with key statistics
2. **Top Reactions Table** (10 most frequent): Adverse reactions with frequency counts
3. **Demographics Summary + Risk Assessment** (2 concise paragraphs): Gender patterns and age-related mortality risks

Execute each query sequentially and provide comprehensive drug safety intelligence covering statistical analysis, reaction profiles, and demographic risk assessment for pharmaceutical safety analysis.`;

    // Create simplified prompt with schema reference
    const simplifiedPrompt = `EXECUTE EXACTLY: Use the fda_info tool with the provided JSON parameters below.

SCHEMA REFERENCE:
- Use the fda_info tool schema parameters: method, search_term, search_type, count, limit
- For field validation, check the tool's built-in schema validation
- Available search_type options: "general", "label", "adverse_events", "recalls", "shortages"
- count parameter accepts field names from the FDA database
- fields_for_adverse_events accepts single field names for targeted searches

${basePrompt}`;

    return this.createPromptResult(
      `Drug Safety Intelligence Report for ${drug_name}`,
      simplifiedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for adverse events
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Adverse Events Total Count",
        description: "Get total number of adverse event reports for a drug",
        query: {
          method: "lookup_drug",
          search_term: "patient.drug.medicinalproduct:\"aspirin\"",
          search_type: "adverse_events",
          field_exists: "patient.reaction.reactionmeddrapt",
          limit: 1
        },
        expectedFields: ["patient.reaction.reactionmeddrapt"],
        notes: "field_exists parameter validates reports have reaction data"
      },
      {
        name: "Top Adverse Reactions",
        description: "Count most frequently reported adverse reactions",
        query: {
          method: "lookup_drug",
          search_term: "patient.drug.medicinalproduct:\"aspirin\"",
          search_type: "adverse_events",
          count: "patient.reaction.reactionmeddrapt",
          limit: 10
        },
        expectedFields: ["patient.reaction.reactionmeddrapt"],
        notes: "Note: Remove .exact suffix from count parameter"
      },
      {
        name: "Serious Events by Gender",
        description: "Analyze serious adverse events by patient gender",
        query: {
          method: "lookup_drug",
          search_term: "patient.drug.medicinalproduct:\"aspirin\" AND serious:1",
          search_type: "adverse_events",
          count: "patient.patientsex",
          limit: 5
        },
        expectedFields: ["patient.patientsex"],
        notes: "serious:1 filters for serious events only. Gender codes: 1=male, 2=female"
      },
      {
        name: "Death Events by Age",
        description: "Analyze fatal events by patient age at onset",
        query: {
          method: "lookup_drug",
          search_term: "patient.drug.medicinalproduct:\"aspirin\" AND seriousnessdeath:1",
          search_type: "adverse_events",
          count: "patient.patientonsetage",
          limit: 8
        },
        expectedFields: ["patient.patientonsetage"],
        notes: "seriousnessdeath:1 filters for fatal outcomes only"
      }
    ];
  }

  /**
   * Get the primary search type for this prompt
   */
  protected getPrimarySearchType(): FdaSearchType {
    return 'adverse_events';
  }
}