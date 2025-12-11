#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { lookupDrug, lookupDevice } from './fda-search.js';

const server = new McpServer(
  {
    name: 'fda-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        "listChanged": true
      },
      prompts: {
        "listChanged": true
      },
    },
  }
);

// Register the FDA info tool
server.tool('fda_info', 'Unified tool for FDA drug and medical device information lookup. Access drug labels, adverse events, regulatory information, recalls, shortages, and device registration data from the openFDA database.', {
  method: z.enum(['lookup_drug', 'lookup_device']).describe('The operation to perform: lookup_drug (search across multiple relevant fields, or search a specific field if field parameter is provided), lookup_device (search device registration and listing data)'),
  search_term: z.string().describe('Search term to look for in the FDA database. Can be a drug name (generic or brand), manufacturer name, dosage form, marketing status, or any other searchable value. Supports wildcards (*), phrase matches ("term"), boolean operators (AND, OR), field combinations, date ranges, and special modifiers (_missing_, _exists_). Examples: Simple: "aspirin", "PFIZER"; Field searches: "sponsor_name:PFIZER", "products.brand_name:VISTARIL"; Complex: "sponsor_name:\\"PFIZER\\"+AND+products.dosage_form:\\"CAPSULE\\"", "(products.dosage_form:\\"TABLET\\"+OR+products.dosage_form:\\"CAPSULE\\")+AND+sponsor_name:\\"PFIZER\\"; Date ranges: "receivedate:[20240101+TO+20241231]", "receivedate:[20240815+TO+20240915]+AND+patient.drug.medicinalproduct:semaglutide"'),
  search_type: z.enum(['general', 'label', 'adverse_events', 'recalls', 'shortages', 'device_registration', 'device_pma', 'device_510k', 'device_udi', 'device_recalls', 'device_adverse_events', 'device_classification']).default('general').describe('Type of information to retrieve. For drugs: "general" for comprehensive search, "label" for prescribing information, "adverse_events" for safety data, "recalls" for drug recalls, "shortages" for supply shortages. For devices: "device_registration" for medical device registration and listing data, "device_pma" for Pre-Market Approval (PMA) decisions and submissions, "device_510k" for 510(k) premarket notification clearances, "device_udi" for Unique Device Identifier (UDI) database information, "device_recalls" for device recalls and enforcement reports, "device_adverse_events" for medical device adverse event reports, "device_classification" for device classification and regulatory information'),
  fields_for_general: z.string().optional().describe('Optional field to search within general drug data'),
  fields_for_adverse_events: z.string().optional().describe('Optional field to search within adverse events data'),
  fields_for_label: z.string().optional().describe('Optional field to search within drug labels'),
  fields_for_recalls: z.string().optional().describe('Optional field to search within drug recalls and enforcement reports'),
  fields_for_shortages: z.string().optional().describe('Optional field to search within drug shortages data'),
  fields_for_device_registration: z.string().optional().describe('Optional field to search within device registration and listing data'),
  fields_for_device_pma: z.string().optional().describe('Optional field to search within device PMA (Pre-Market Approval) data'),
  fields_for_device_510k: z.string().optional().describe('Optional field to search within device 510(k) clearance data'),
  fields_for_device_udi: z.string().optional().describe('Optional field to search within device UDI (Unique Device Identifier) data'),
  fields_for_device_recalls: z.string().optional().describe('Optional field to search within device enforcement (recall) data'),
  fields_for_device_adverse_events: z.string().optional().describe('Optional field to search within device adverse event data'),
  fields_for_device_classification: z.string().optional().describe('Optional field to search within device classification data'),
  count: z.string().optional().describe('Field to count/aggregate results by'),
  pharm_class: z.string().optional().describe('Search by pharmacological class (drug class)'),
  field_exists: z.string().optional().describe('Filter records to only those that contain a specific field, regardless of field contents'),
  limit: z.number().min(1).max(100).default(10).describe('Maximum number of records to return (default: 10, max: 100)')
}, async (args) => {
  try {
    const { method, search_term, search_type = 'general', fields_for_general, fields_for_adverse_events, fields_for_label, fields_for_recalls, fields_for_shortages, fields_for_device_registration, fields_for_device_pma, fields_for_device_510k, fields_for_device_udi, fields_for_device_recalls, fields_for_device_adverse_events, fields_for_device_classification, count, pharm_class, field_exists, limit = 10 } = args;

    if (!search_term) {
      throw new Error('search_term parameter is required');
    }

    switch (method) {
      case 'lookup_drug': {
        // Determine which field parameter to use based on search_type
        let field = null;
        if (search_type === 'adverse_events' && fields_for_adverse_events) {
          field = fields_for_adverse_events;
        } else if (search_type === 'label' && fields_for_label) {
          field = fields_for_label;
        } else if (search_type === 'recalls' && fields_for_recalls) {
          field = fields_for_recalls;
        } else if (search_type === 'shortages' && fields_for_shortages) {
          field = fields_for_shortages;
        } else if (search_type === 'general' && fields_for_general) {
          field = fields_for_general;
        }

        const results = await lookupDrug(search_term, search_type, limit, field, count, pharm_class, field_exists);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'lookup_device': {
        // Determine which field parameter to use based on search_type
        let field = null;
        if (search_type === 'device_registration' && fields_for_device_registration) {
          field = fields_for_device_registration;
        } else if (search_type === 'device_pma' && fields_for_device_pma) {
          field = fields_for_device_pma;
        } else if (search_type === 'device_510k' && fields_for_device_510k) {
          field = fields_for_device_510k;
        } else if (search_type === 'device_udi' && fields_for_device_udi) {
          field = fields_for_device_udi;
        } else if (search_type === 'device_recalls' && fields_for_device_recalls) {
          field = fields_for_device_recalls;
        } else if (search_type === 'device_adverse_events' && fields_for_device_adverse_events) {
          field = fields_for_device_adverse_events;
        } else if (search_type === 'device_classification' && fields_for_device_classification) {
          field = fields_for_device_classification;
        }

        const results = await lookupDevice(search_term, search_type, limit, field);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            success: false
          }, null, 2)
        }
      ]
    };
  }
});

// Register all 7 prompts
server.registerPrompt('drug_safety_analysis', {
  description: 'Comprehensive drug safety analysis using FDA adverse events data (FAERS database). Analyzes safety profile with total reports, top reactions, serious events by demographics, and age patterns for deaths.',
  argsSchema: {
    drug_name: z.string().describe('Name of the drug to analyze (generic or brand name)')
  }
}, async (args) => {
  const { drug_name } = args;
  const prompt = `Analyze the safety profile for ${drug_name} using FDA adverse events data with these optimized queries:

1. Total reports with reaction data:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "field_exists": "patient.reaction.reactionmeddrapt",
       "limit": 1
     }

2. Top adverse reactions (count statistics):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 10
     }

3. Gender distribution of serious events:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1",
       "search_type": "adverse_events",
       "count": "patient.patientsex",
       "limit": 5
     }

4. Age patterns in death outcomes:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND patient.reaction.reactionoutcome:5",
       "search_type": "adverse_events",
       "field_exists": "patient.patientonsetage",
       "limit": 20
     }

5. Recent serious events (last 2 years):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1 AND receivedate:[20220101+TO+*]",
       "search_type": "adverse_events",
       "limit": 15
     }

Execute each query sequentially and provide a comprehensive safety analysis covering:
- Overall safety profile with total adverse event reports
- Most frequently reported adverse reactions and their significance
- Demographic patterns in serious adverse events
- Age-related patterns in fatal outcomes
- Recent trends in serious adverse events

Present findings with clinical context and statistical interpretation for pharmaceutical safety assessment.`;

  return {
    description: `Drug safety analysis for ${drug_name}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('pharmaceutical_competitive_intelligence', {
  description: 'Comprehensive pharmaceutical competitive intelligence analysis for company positioning, market share, portfolio strength, and strategic assessment using FDA regulatory data.',
  argsSchema: {
    company_name: z.string().describe('Name of the pharmaceutical company to analyze (sponsor name in FDA database)')
  }
}, async (args) => {
  const { company_name } = args;
  const prompt = `Conduct comprehensive pharmaceutical competitive intelligence analysis for ${company_name} using FDA regulatory data:

1. Company drug portfolio overview:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "general",
       "fields_for_general": "sponsor_name",
       "limit": 50
     }

2. Recent regulatory approvals and submissions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${company_name}\\" AND submissions.submission_status:AP",
       "search_type": "general",
       "limit": 25
     }

3. Safety profile across company portfolio:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.openfda.manufacturer_name:\\"${company_name}\\"",
       "search_type": "adverse_events",
       "count": "serious",
       "limit": 10
     }

4. Product recalls and enforcement actions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "recalls",
       "fields_for_recalls": "recalling_firm",
       "limit": 20
     }

5. Supply chain vulnerabilities:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "shortages",
       "fields_for_shortages": "company_name",
       "limit": 15
     }

Analyze and present:
- Portfolio breadth and therapeutic focus areas
- Regulatory performance and approval success rates
- Safety profile compared to industry standards
- Supply chain reliability and risk factors
- Strategic positioning and competitive advantages`;

  return {
    description: `Pharmaceutical competitive intelligence for ${company_name}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('generic_competition_assessment', {
  description: 'Comprehensive generic competition assessment for Orange Book FDA analysis. Evaluates market entry patterns, competitive landscape, reference vs generic drug distinction, and market maturity indicators.',
  argsSchema: {
    brand_drug: z.string().optional().describe('Brand name of the drug to analyze for generic competition (provide either brand_drug or generic_name)'),
    generic_name: z.string().optional().describe('Generic name of the drug to analyze for generic competition (provide either brand_drug or generic_name)')
  }
}, async (args) => {
  const { brand_drug, generic_name } = args;
  const searchTerm = brand_drug || generic_name;
  const fieldType = brand_drug ? 'openfda.brand_name' : 'openfda.generic_name';

  const prompt = `Conduct comprehensive generic competition assessment for ${searchTerm}:

1. Reference vs Generic drug landscape:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${fieldType}",
       "count": "products.reference_drug",
       "limit": 25
     }

2. Market maturity and competition level:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${fieldType}",
       "count": "sponsor_name",
       "limit": 20
     }

3. Dosage forms and strength variations:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${fieldType}",
       "count": "products.dosage_form",
       "limit": 15
     }

4. Marketing status distribution:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${fieldType}",
       "count": "products.marketing_status",
       "limit": 10
     }

Analyze and present:
- Number of generic competitors in the market
- Market concentration and competitive intensity
- Available dosage forms and therapeutic options
- Patent protection status and generic entry patterns
- Market maturity indicators and future competition outlook`;

  return {
    description: `Generic competition assessment for ${searchTerm}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('supply_chain_intelligence', {
  description: 'Comprehensive supply chain risk assessment for drug manufacturing and availability. Analyzes current shortages, therapeutic vulnerability patterns, supplier concentration risks, and manufacturing resilience.',
  argsSchema: {
    drug_name: z.string().optional().describe('Specific drug name (generic) to analyze for supply chain risks (provide either drug_name or therapeutic_area)'),
    therapeutic_area: z.string().optional().describe('Therapeutic area to analyze (e.g., "Oncology", "Cardiovascular", "Pediatric") (provide either drug_name or therapeutic_area)')
  }
}, async (args) => {
  const { drug_name, therapeutic_area } = args;
  const searchTerm = drug_name || therapeutic_area;
  const fieldType = drug_name ? 'generic_name' : 'therapeutic_category';

  const prompt = `Conduct comprehensive supply chain intelligence analysis for ${searchTerm}:

1. Current shortage status:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "shortages",
       "fields_for_shortages": "${fieldType}",
       "limit": 25
     }

2. Historical shortage patterns:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "*",
       "search_type": "shortages",
       "count": "status",
       "limit": 10
     }

3. Supplier concentration risk:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${drug_name ? 'openfda.generic_name' : 'sponsor_name'}",
       "count": "sponsor_name",
       "limit": 20
     }

4. Therapeutic area vulnerability:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "*",
       "search_type": "shortages",
       "count": "therapeutic_category",
       "limit": 15
     }

5. Manufacturing quality issues:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "recalls",
       "count": "reason_for_recall",
       "limit": 15
     }

Analyze and present:
- Current availability and shortage risks
- Supplier concentration and single-source dependencies
- Historical shortage frequency and duration patterns
- Manufacturing quality and recall patterns
- Supply chain resilience recommendations`;

  return {
    description: `Supply chain intelligence for ${searchTerm}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('fda_regulatory_intelligence', {
  description: 'Comprehensive FDA regulatory intelligence analysis combining approval timeline, safety surveillance, recent regulatory activity, and supply chain status for drugs or companies.',
  argsSchema: {
    drug_name: z.string().optional().describe('Drug name (brand or generic) to analyze for regulatory intelligence (provide either drug_name or company_name)'),
    company_name: z.string().optional().describe('Pharmaceutical company name to analyze for regulatory intelligence (provide either drug_name or company_name)')
  }
}, async (args) => {
  const { drug_name, company_name } = args;
  const searchTerm = drug_name || company_name;
  const isCompany = !!company_name;

  const prompt = `Conduct comprehensive FDA regulatory intelligence analysis for ${searchTerm}:

1. Regulatory approval status and history:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${isCompany ? 'sponsor_name' : 'openfda.generic_name'}",
       "count": "submissions.submission_status",
       "limit": 20
     }

2. Recent submission activity:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${isCompany ? 'sponsor_name' : 'openfda.generic_name'}:\\"${searchTerm}\\" AND submissions.submission_status_date:[20230101+TO+*]",
       "search_type": "general",
       "limit": 25
     }

3. Safety surveillance signals:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${isCompany ? 'patient.drug.openfda.manufacturer_name' : 'patient.drug.medicinalproduct'}:\\"${searchTerm}\\" AND serious:1 AND receivedate:[20230101+TO+*]",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 15
     }

4. Enforcement and compliance actions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "recalls",
       "fields_for_recalls": "${isCompany ? 'recalling_firm' : 'product_description'}",
       "limit": 20
     }

5. Supply chain status:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "shortages",
       "fields_for_shortages": "${isCompany ? 'company_name' : 'generic_name'}",
       "limit": 15
     }

Analyze and present:
- Regulatory approval timeline and success rates
- Recent FDA submission activity and priorities
- Safety profile and emerging surveillance signals
- Compliance history and enforcement actions
- Supply chain reliability and risk factors`;

  return {
    description: `FDA regulatory intelligence for ${searchTerm}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('weekly_regulatory_monitoring', {
  description: 'Automated weekly pharmaceutical regulatory intelligence report with surveillance queries for monitoring regulatory activity, safety signals, and supply chain intelligence.',
  argsSchema: {
    target_entity: z.string().describe('Company name, drug name, or therapeutic area to monitor (e.g., "Pfizer", "metformin", "Oncology")'),
    current_date: z.string().describe('Current date in YYYY-MM-DD format for date range calculations (e.g., "2024-09-17")')
  }
}, async (args) => {
  const { target_entity, current_date } = args;
  const weekAgo = new Date(new Date(current_date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
  const currentDateFormatted = current_date.replace(/-/g, '');

  const prompt = `Weekly regulatory monitoring report for ${target_entity} (${current_date}):

1. Recent adverse events (last 7 days):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${target_entity}\\" AND receivedate:[${weekAgo}+TO+${currentDateFormatted}]",
       "search_type": "adverse_events",
       "count": "serious",
       "limit": 20
     }

2. New regulatory submissions (last 7 days):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${target_entity}\\" AND submissions.submission_status_date:[${weekAgo}+TO+${currentDateFormatted}]",
       "search_type": "general",
       "limit": 15
     }

3. Recent recalls or enforcement actions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "recalling_firm:\\"${target_entity}\\" AND report_date:[${current_date.substring(0,4)}-01-01+TO+${current_date}]",
       "search_type": "recalls",
       "limit": 10
     }

4. Supply chain updates:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${target_entity}",
       "search_type": "shortages",
       "fields_for_shortages": "company_name",
       "limit": 10
     }

5. Competitive landscape changes:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${target_entity}",
       "search_type": "general",
       "count": "submissions.submission_status",
       "limit": 10
     }

Generate a structured weekly report including:
- Executive summary of key developments
- Safety signal alerts and trending adverse events
- Regulatory milestone updates and approvals
- Supply chain risk assessments
- Competitive intelligence insights
- Recommended follow-up actions`;

  return {
    description: `Weekly regulatory monitoring for ${target_entity}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

server.registerPrompt('fda_market_intelligence', {
  description: 'FDA-focused market intelligence analysis including patent protection timelines, generic competition risks, and regulatory pathway impacts on market access for investment decision-making.',
  argsSchema: {
    drug_name: z.string().optional().describe('Drug name (brand or generic) for market intelligence analysis (provide either drug_name or company_name)'),
    company_name: z.string().optional().describe('Pharmaceutical company name for market intelligence analysis (provide either drug_name or company_name)')
  }
}, async (args) => {
  const { drug_name, company_name } = args;
  const searchTerm = drug_name || company_name;
  const isCompany = !!company_name;

  const prompt = `Conduct FDA-focused market intelligence analysis for ${searchTerm}:

1. Market exclusivity and competition landscape:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${isCompany ? 'sponsor_name' : 'openfda.brand_name'}",
       "count": "products.reference_drug",
       "limit": 25
     }

2. Generic competition timeline:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${isCompany ? 'sponsor_name' : 'openfda.generic_name'}",
       "count": "sponsor_name",
       "limit": 20
     }

3. Regulatory pathway advantages:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "general",
       "fields_for_general": "${isCompany ? 'sponsor_name' : 'openfda.generic_name'}",
       "count": "submissions.review_priority",
       "limit": 15
     }

4. Safety liability assessment:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${isCompany ? 'patient.drug.openfda.manufacturer_name' : 'patient.drug.medicinalproduct'}:\\"${searchTerm}\\"",
       "search_type": "adverse_events",
       "count": "serious",
       "limit": 10
     }

5. Supply chain risk factors:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${searchTerm}",
       "search_type": "shortages",
       "fields_for_shortages": "${isCompany ? 'company_name' : 'generic_name'}",
       "count": "status",
       "limit": 10
     }

Generate investment-focused analysis including:
- Market exclusivity protection and erosion timeline
- Generic competition risk assessment and timing
- Regulatory advantages and approval pathway benefits
- Safety liability profile and litigation risks
- Supply chain stability and manufacturing resilience
- Revenue protection strategies and market access implications`;

  return {
    description: `FDA market intelligence for ${searchTerm}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
});

// Legacy prompt handlers for Claude Code compatibility
const legacyPrompts = [
  {
    name: "drug_safety_analysis",
    description: "Comprehensive drug safety analysis using FDA adverse events data (FAERS database). Analyzes safety profile with total reports, top reactions, serious events by demographics, and age patterns for deaths.",
    arguments: [
      {
        name: "drug_name",
        description: "Name of the drug to analyze (generic or brand name)",
        required: true
      }
    ]
  },
  {
    name: "pharmaceutical_competitive_intelligence",
    description: "Comprehensive pharmaceutical competitive intelligence analysis for company positioning, market share, portfolio strength, and strategic assessment using FDA regulatory data.",
    arguments: [
      {
        name: "company_name",
        description: "Name of the pharmaceutical company to analyze (sponsor name in FDA database)",
        required: true
      }
    ]
  },
  {
    name: "generic_competition_assessment",
    description: "Comprehensive generic competition assessment for Orange Book FDA analysis. Evaluates market entry patterns, competitive landscape, reference vs generic drug distinction, and market maturity indicators.",
    arguments: [
      {
        name: "brand_drug",
        description: "Brand name of the drug to analyze for generic competition (provide either brand_drug or generic_name)",
        required: false
      },
      {
        name: "generic_name",
        description: "Generic name of the drug to analyze for generic competition (provide either brand_drug or generic_name)",
        required: false
      }
    ]
  },
  {
    name: "supply_chain_intelligence",
    description: "Comprehensive supply chain risk assessment for drug manufacturing and availability. Analyzes current shortages, therapeutic vulnerability patterns, supplier concentration risks, and manufacturing resilience.",
    arguments: [
      {
        name: "drug_name",
        description: "Specific drug name (generic) to analyze for supply chain risks (provide either drug_name or therapeutic_area)",
        required: false
      },
      {
        name: "therapeutic_area",
        description: "Therapeutic area to analyze (e.g., \"Oncology\", \"Cardiovascular\", \"Pediatric\") (provide either drug_name or therapeutic_area)",
        required: false
      }
    ]
  },
  {
    name: "fda_regulatory_intelligence",
    description: "Comprehensive FDA regulatory intelligence analysis combining approval timeline, safety surveillance, recent regulatory activity, and supply chain status for drugs or companies.",
    arguments: [
      {
        name: "drug_name",
        description: "Drug name (brand or generic) to analyze for regulatory intelligence (provide either drug_name or company_name)",
        required: false
      },
      {
        name: "company_name",
        description: "Pharmaceutical company name to analyze for regulatory intelligence (provide either drug_name or company_name)",
        required: false
      }
    ]
  },
  {
    name: "weekly_regulatory_monitoring",
    description: "Automated weekly pharmaceutical regulatory intelligence report with surveillance queries for monitoring regulatory activity, safety signals, and supply chain intelligence.",
    arguments: [
      {
        name: "target_entity",
        description: "Company name, drug name, or therapeutic area to monitor (e.g., \"Pfizer\", \"metformin\", \"Oncology\")",
        required: true
      },
      {
        name: "current_date",
        description: "Current date in YYYY-MM-DD format for date range calculations (e.g., \"2024-09-17\")",
        required: true
      }
    ]
  },
  {
    name: "fda_market_intelligence",
    description: "FDA-focused market intelligence analysis including patent protection timelines, generic competition risks, and regulatory pathway impacts on market access for investment decision-making.",
    arguments: [
      {
        name: "drug_name",
        description: "Drug name (brand or generic) for market intelligence analysis (provide either drug_name or company_name)",
        required: false
      },
      {
        name: "company_name",
        description: "Pharmaceutical company name for market intelligence analysis (provide either drug_name or company_name)",
        required: false
      }
    ]
  }
];

const legacyPromptHandlers = {
  "drug_safety_analysis": ({ drug_name }) => {
    const prompt = `Analyze the safety profile for ${drug_name} using FDA adverse events data with these optimized queries:

1. Total reports with reaction data:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "field_exists": "patient.reaction.reactionmeddrapt",
       "limit": 1
     }

2. Top adverse reactions (count statistics):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 10
     }

3. Gender distribution of serious events:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1",
       "search_type": "adverse_events",
       "count": "patient.patientsex",
       "limit": 5
     }

4. Age patterns in death outcomes:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND patient.reaction.reactionoutcome:5",
       "search_type": "adverse_events",
       "field_exists": "patient.patientonsetage",
       "limit": 20
     }

5. Recent serious events (last 2 years):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1 AND receivedate:[20220101+TO+*]",
       "search_type": "adverse_events",
       "limit": 15
     }

Execute each query sequentially and provide a comprehensive safety analysis covering:
- Overall safety profile with total adverse event reports
- Most frequently reported adverse reactions and their significance
- Demographic patterns in serious adverse events
- Age-related patterns in fatal outcomes
- Recent trends in serious adverse events

Present findings with clinical context and statistical interpretation for pharmaceutical safety assessment.`;

    return {
      description: `Drug safety analysis for ${drug_name}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  },

  "pharmaceutical_competitive_intelligence": ({ company_name }) => {
    const prompt = `Conduct comprehensive pharmaceutical competitive intelligence analysis for ${company_name} using FDA regulatory data:

1. Company drug portfolio overview:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "general",
       "fields_for_general": "sponsor_name",
       "limit": 50
     }

2. Recent regulatory approvals and submissions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${company_name}\\" AND submissions.submission_status:AP",
       "search_type": "general",
       "limit": 25
     }

3. Safety profile across company portfolio:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.openfda.manufacturer_name:\\"${company_name}\\"",
       "search_type": "adverse_events",
       "count": "serious",
       "limit": 10
     }

4. Product recalls and enforcement actions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "recalls",
       "fields_for_recalls": "recalling_firm",
       "limit": 20
     }

5. Supply chain vulnerabilities:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${company_name}",
       "search_type": "shortages",
       "fields_for_shortages": "company_name",
       "limit": 15
     }

Analyze and present:
- Portfolio breadth and therapeutic focus areas
- Regulatory performance and approval success rates
- Safety profile compared to industry standards
- Supply chain reliability and risk factors
- Strategic positioning and competitive advantages`;

    return {
      description: `Pharmaceutical competitive intelligence for ${company_name}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  },

  // Add handlers for other prompts with simplified implementations
  "generic_competition_assessment": (args) => {
    const searchTerm = args.brand_drug || args.generic_name;
    return {
      description: `Generic competition assessment for ${searchTerm}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct comprehensive generic competition assessment for ${searchTerm} using FDA data to analyze market entry patterns, competitive landscape, and market maturity indicators.`
          }
        }
      ]
    };
  },

  "supply_chain_intelligence": (args) => {
    const searchTerm = args.drug_name || args.therapeutic_area;
    return {
      description: `Supply chain intelligence for ${searchTerm}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct comprehensive supply chain intelligence analysis for ${searchTerm} focusing on current shortages, vulnerability patterns, and manufacturing resilience.`
          }
        }
      ]
    };
  },

  "fda_regulatory_intelligence": (args) => {
    const searchTerm = args.drug_name || args.company_name;
    return {
      description: `FDA regulatory intelligence for ${searchTerm}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct comprehensive FDA regulatory intelligence analysis for ${searchTerm} combining approval timeline, safety surveillance, and recent regulatory activity.`
          }
        }
      ]
    };
  },

  "weekly_regulatory_monitoring": ({ target_entity, current_date }) => {
    return {
      description: `Weekly regulatory monitoring for ${target_entity}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate weekly regulatory monitoring report for ${target_entity} as of ${current_date}, including safety signals, regulatory updates, and competitive intelligence.`
          }
        }
      ]
    };
  },

  "fda_market_intelligence": (args) => {
    const searchTerm = args.drug_name || args.company_name;
    return {
      description: `FDA market intelligence for ${searchTerm}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Conduct FDA-focused market intelligence analysis for ${searchTerm} including patent protection timelines, generic competition risks, and regulatory pathway impacts.`
          }
        }
      ]
    };
  }
};

// Add legacy prompt handlers for Claude Code compatibility
// Note: McpServer doesn't expose setRequestHandler, so we need to access the underlying server
const underlyingServer = server._server || server.server || server;
if (underlyingServer && underlyingServer.setRequestHandler) {
  underlyingServer.setRequestHandler(ListPromptsRequestSchema, () => ({
    prompts: legacyPrompts
  }));

  underlyingServer.setRequestHandler(GetPromptRequestSchema, (request) => {
    const { name, arguments: args } = request.params;
    const promptHandler = legacyPromptHandlers[name];
    if (promptHandler) {
      return promptHandler(args || {});
    }
    throw new Error(`Prompt not found: ${name}`);
  });
} else {
  console.error('Unable to access underlying server for legacy prompt handlers');
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with JSON-RPC
  process.stderr.write('FDA MCP server running on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);
});