/**
 * Enhanced Weekly Regulatory Monitoring Prompt
 * Implements AI Assistant Prompt Enhancement PRD specifications
 * Automated weekly pharmaceutical regulatory intelligence report with surveillance queries
 */

import { EnhancedPrompt, WorkingExample } from './enhanced-base.js';
import { PromptExecutionResult } from '../types/index.js';
import { MonitoringArgsSchema, FdaSearchType } from '../types/fda.js';
import { z } from 'zod';

interface MonitoringArgs {
  company_name?: string;
  therapeutic_area?: string;
  drug_name?: string;
  brand_name?: string;
  current_date: string;
}

export class WeeklyMonitoringPrompt extends EnhancedPrompt<MonitoringArgs> {
  constructor() {
    super(
      'fda_weekly_surveillance_report',
      'Automated weekly pharmaceutical regulatory intelligence report with surveillance queries for monitoring regulatory activity, safety signals, and supply chain intelligence.',
      {
        company_name: z.string().optional().describe('Company name to monitor for regulatory activity'),
        therapeutic_area: z.string().optional().describe('Therapeutic area/class to monitor'),
        drug_name: z.string().optional().describe('Drug name to monitor for regulatory activity'),
        brand_name: z.string().optional().describe('Brand name to monitor for regulatory activity'),
        current_date: MonitoringArgsSchema.shape.current_date.describe('Current date in YYYY-MM-DD format for the monitoring report')
      }
    );
  }

  protected async execute(
    params: MonitoringArgs,
    _requestId: string
  ): Promise<PromptExecutionResult> {
    const { company_name, therapeutic_area, drug_name, brand_name, current_date } = params;

    // Use placeholders if not provided
    const companyName = company_name || '[COMPANY]';
    const drugName = drug_name || '[DRUG_NAME]';
    const brandName = brand_name || '[BRAND_NAME]';
    const monitoringTarget = company_name || therapeutic_area || drug_name || brand_name || 'target entity';

    // Base prompt content with corrected queries
    const basePrompt = `Today is ${current_date}. Create automated weekly monitoring for ${monitoringTarget} with these surveillance queries (calculate date ranges accounting for 1-week FDA data processing delay):

**1. Core Regulatory Intelligence**

1a. Weekly regulatory submission activity - sponsor analysis:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.submission_status_date:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "sponsor_name"
    }

1b. Weekly regulatory submission activity - brand names:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.submission_status_date:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "openfda.brand_name"
    }

1c. Weekly regulatory submission activity - submission class:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.submission_status_date:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "submissions.submission_class_code"
    }

1d. Weekly regulatory submission activity - submission dates:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.submission_status_date:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "submissions.submission_status_date"
    }

2a. Priority review pipeline - sponsors:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.review_priority:\\"PRIORITY\\"",
      "search_type": "general",
      "limit": 8,
      "fields_for_general": "sponsor_name"
    }

2b. Priority review pipeline - brand names:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "submissions.review_priority:\\"PRIORITY\\"",
      "search_type": "general",
      "limit": 8,
      "fields_for_general": "openfda.brand_name"
    }

3a. Company focus - submissions:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "sponsor_name:\\"${companyName}\\"",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "submissions.submission_type"
    }

3b. Company focus - submission dates:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "sponsor_name:\\"${companyName}\\"",
      "search_type": "general",
      "limit": 10,
      "fields_for_general": "submissions.submission_status_date"
    }

**2. Safety Intelligence**

4a. Weekly adverse events count:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "receivedate:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "adverse_events",
      "count": "patient.drug.medicinalproduct",
      "limit": 10
    }

4b. Targeted safety signals - serious events:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "patient.drug.medicinalproduct:\\"${drugName}\\" AND serious:1 AND receivedate:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "adverse_events",
      "count": "patient.reaction.reactionmeddrapt",
      "limit": 8
    }

4c. Brand-specific safety signals:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "patient.drug.openfda.brand_name:\\"${brandName}\\" AND serious:1 AND receivedate:[LAST_WEEK_START+TO+LAST_WEEK_END]",
      "search_type": "adverse_events",
      "count": "patient.reaction.reactionmeddrapt",
      "limit": 8
    }

**3. Supply Chain Intelligence**

5a. Current shortages - company analysis:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "status:\\"Current\\" AND company_name:\\"${companyName}\\"",
      "search_type": "shortages",
      "limit": 10,
      "fields_for_shortages": "generic_name"
    }

5b. Current shortages - reason analysis:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "status:\\"Current\\" AND company_name:\\"${companyName}\\"",
      "search_type": "shortages",
      "limit": 10,
      "fields_for_shortages": "shortage_reason"
    }

5c. Drug-specific shortages:
    - Tool: fda_info
    - EXECUTE EXACTLY:
    {
      "method": "lookup_drug",
      "search_term": "status:\\"Current\\" AND generic_name:\\"${drugName}\\"",
      "search_type": "shortages",
      "limit": 10,
      "fields_for_shortages": "company_name"
    }

**Parameter Syntax & Field Reference:**
- **Date ranges**: \`receivedate:[YYYYMMDD+TO+YYYYMMDD]\` for adverse events, \`submissions.submission_status_date:[YYYYMMDD+TO+YYYYMMDD]\` for regulatory activity
- **Dynamic date calculation**: AI will automatically calculate date ranges based on "Today is ${current_date}" in prompt:
  - \`[LAST_WEEK_START+TO+LAST_WEEK_END]\` → Calculate **three weeks ago** Monday-Sunday from the stated current date
  - \`[LAST_MONTH_START+TO+LAST_MONTH_END]\` → Calculate **two months ago** full month from the stated current date
  - **CRITICAL**: Always use the YEAR from the "Today is ${current_date}" statement, never use hardcoded years
  - **Processing delay**: Use data from 2-3 weeks ago for adverse events, 1-2 weeks ago for regulatory submissions due to different reporting timelines
  - **Format**: Always use YYYYMMDD format (Year-Month-Day with no separators)
  - **Calculation method**: Count backwards from the stated current date to find the appropriate week/month, then convert to YYYYMMDD format
- **Field requirements**: Single field per fields_for_general parameter, no comma separation
- **Count parameters**: Remove .exact suffix from count fields
- **Search syntax**: Use boolean operators \`AND\`, \`OR\`, quote values properly
- **Placeholders**: Replace [COMPANY] with sponsor name, [DRUG_NAME] with generic name, [BRAND_NAME] with brand name

**Field Interpretation:**
- Submission class codes: Priority, Standard, Fast Track, Breakthrough
- Review priority: PRIORITY (expedited), STANDARD (normal timeline)
- Adverse event dates: receivedate (when FDA received the report)
- Shortage status: Current (active), Resolved (ended), To Be Discontinued

**Output Format:**
1. **Executive Summary** (3 bullet points): Key developments, emerging risks, competitive threats
2. **Regulatory Activity Table**: New approvals, submissions, status changes with dates
3. **Safety Alerts** (2 bullet points): Notable adverse event patterns, regulatory communications
4. **Supply Chain Status** (2 bullet points): Active shortages, resolution progress
5. **Strategic Implications** (1 paragraph): Impact assessment and recommended actions

Format as readable bullet points and paragraphs, not as JSON or structured data.

**Automation Setup:**
- Schedule weekly execution with date range auto-adjustment
- Configure stakeholder distribution lists
- Set up threshold alerts for significant developments

Execute each query sequentially and generate a comprehensive weekly pharmaceutical regulatory intelligence report.`;

    // Build enhanced prompt with AI assistant guidance
    const enhancedPrompt = this.buildEnhancedPrompt(
      basePrompt,
      this.getPrimarySearchType(),
      this.getPromptSpecificExamples()
    );

    return this.createPromptResult(
      `Enhanced Weekly Pharmaceutical Regulatory Intelligence Report for ${monitoringTarget}`,
      enhancedPrompt
    );
  }

  /**
   * Get prompt-specific working examples for weekly monitoring
   */
  protected getPromptSpecificExamples(): WorkingExample[] {
    return [
      {
        name: "Weekly Regulatory Activity",
        description: "Monitor regulatory submissions from last week",
        query: {
          method: "lookup_drug",
          search_term: "submissions.submission_status_date:[20240901+TO+20240907]",
          search_type: "general",
          limit: 10,
          fields_for_general: "sponsor_name"
        },
        expectedFields: ["sponsor_name"],
        notes: "Date format: YYYYMMDD. Calculate date ranges from current_date parameter"
      },
      {
        name: "Priority Review Pipeline",
        description: "Find drugs in priority review status",
        query: {
          method: "lookup_drug",
          search_term: "submissions.review_priority:\"PRIORITY\"",
          search_type: "general",
          limit: 8,
          fields_for_general: "openfda.brand_name"
        },
        expectedFields: ["openfda.brand_name"],
        notes: "PRIORITY must be quoted. Shows expedited review drugs"
      },
      {
        name: "Weekly Adverse Events",
        description: "Count adverse events received in specific week",
        query: {
          method: "lookup_drug",
          search_term: "receivedate:[20240901+TO+20240907]",
          search_type: "adverse_events",
          count: "patient.drug.medicinalproduct",
          limit: 10
        },
        expectedFields: ["patient.drug.medicinalproduct"],
        notes: "Remove .exact suffix from count parameter"
      },
      {
        name: "Current Drug Shortages",
        description: "Monitor active shortages for specific companies",
        query: {
          method: "lookup_drug",
          search_term: "status:\"Current\" AND company_name:\"PFIZER\"",
          search_type: "shortages",
          limit: 10,
          fields_for_shortages: "generic_name"
        },
        expectedFields: ["generic_name"],
        notes: "Use fields_for_shortages for shortage data, single field only"
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