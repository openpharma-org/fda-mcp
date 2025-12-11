server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
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
            description: 'Therapeutic area to analyze (e.g., "Oncology", "Cardiovascular", "Pediatric") (provide either drug_name or therapeutic_area)',
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
            description: 'Company name, drug name, or therapeutic area to monitor (e.g., "Pfizer", "metformin", "Oncology")',
            required: true
          },
          {
            name: "current_date",
            description: 'Current date in YYYY-MM-DD format for date range calculations (e.g., "2024-09-17")',
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
    ]
  };
});
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "drug_safety_analysis") {
    const drugName = args?.drug_name;
    if (!drugName) {
      throw new Error("drug_name argument is required");
    }
    const prompt = `Analyze the safety profile for ${drugName} using FDA adverse events data with these optimized queries:

1. Total reports with reaction data:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drugName}\\"",
       "search_type": "adverse_events",
       "field_exists": "patient.reaction.reactionmeddrapt",
       "limit": 1
     }

2. Top adverse reactions (count statistics):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drugName}\\"",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 10
     }

3. Serious events by gender demographics:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drugName}\\"+AND+serious:1",
       "search_type": "adverse_events",
       "count": "patient.patientsex",
       "limit": 5
     }

4. Death events by age patterns:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drugName}\\"+AND+seriousnessdeath:1",
       "search_type": "adverse_events",
       "count": "patient.patientonsetage",
       "limit": 8
     }

**Analysis Guidelines:**
- Sex codes: 1=male, 2=female, 0=unknown
- Focus on count statistics for population-level insights, not individual cases
- Look for patterns in age demographics and serious event rates
- Consider reaction frequency and severity

**Output Format:**
1. **Safety Overview** (2 bullets): Total reports summary and data completeness
2. **Top Reactions Table**: Most frequent adverse events with counts
3. **Demographics Summary**: Gender distribution and age patterns for serious events
4. **Risk Assessment** (1 paragraph): Key safety signals and clinical implications

Execute these queries in sequence and provide a comprehensive safety analysis based on the FDA adverse events data.`;
    return {
      description: `Drug safety analysis for ${drugName} using FDA FAERS database`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "pharmaceutical_competitive_intelligence") {
    const companyName = args?.company_name;
    if (!companyName) {
      throw new Error("company_name argument is required");
    }
    const prompt = `Analyze ${companyName}'s competitive position in the pharmaceutical market using FDA regulatory data with these strategic queries:

1. Rank top pharmaceutical companies by prescription drug applications:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "products.marketing_status:Prescription",
       "search_type": "general",
       "count": "sponsor_name",
       "limit": 10
     }

2. Company's position among pharmaceutical competitors with active prescription products:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "application_number",
       "limit": 15
     }

3. Company's top active prescription brands and generic names:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "openfda.brand_name",
       "limit": 15
     }

4. Company's formulation specializations and delivery methods:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "products.dosage_form",
       "limit": 10
     }

5. Company's latest regulatory submissions and pipeline products:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\"",
       "search_type": "general",
       "fields_for_general": "application_number",
       "limit": 10
     }

**Analysis Framework:**
- **Market Position**: Rank vs top 8 sponsors by application volume
- **Portfolio Strength**: Active prescription drugs vs discontinued products
- **Regulatory Momentum**: Recent approvals/submissions in past 2 years
- **Competitive Focus**: Dosage form specialization and therapeutic class concentration

**Output Format:**
1. **Market Position** (3 bullets): Ranking, relative size, competitive tier
2. **Portfolio Summary** (table): Top 5-7 products with status and approval dates
3. **Strategic Assessment** (1 paragraph): Regulatory activity, dosage focus, competitive advantages

Execute these queries in sequence and provide a comprehensive competitive intelligence analysis based on the FDA regulatory data.`;
    return {
      description: `Pharmaceutical competitive intelligence analysis for ${companyName} using FDA regulatory data`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "generic_competition_assessment") {
    const brandDrug = args?.brand_drug;
    const genericName = args?.generic_name;
    if (!brandDrug && !genericName) {
      throw new Error("Either brand_drug or generic_name argument is required");
    }
    const drugIdentifier = brandDrug || genericName;
    const providedType = brandDrug ? "brand" : "generic";
    const prompt = `Assess generic competition for ${drugIdentifier} using Orange Book FDA analysis with these targeted queries:

1. Confirm drug details and derive missing information:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${brandDrug ? `products.brand_name:\\"${brandDrug}\\"` : `openfda.generic_name:\\"${genericName}\\"`}",
       "search_type": "general",
       "fields_for_general": "openfda.brand_name,openfda.generic_name,sponsor_name,application_number",
       "limit": 1
     }

Note: From the result above, use the derived generic name for subsequent queries (queries 2-5 should use the generic name found in openfda.generic_name field).

2. Total competitive landscape including originator + generics:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "sponsor_name",
       "limit": 8
     }

3. Reference vs generic drug distinction:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "sponsor_name,products.reference_drug",
       "limit": 5
     }

4. Latest generic entries (non-reference drugs):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.reference_drug:No",
       "search_type": "general",
       "fields_for_general": "sponsor_name,application_number",
       "limit": 3
     }

5. Market timeline and chronological approvals:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "sponsor_name,products.reference_drug",
       "limit": 3
     }

**Analysis Framework:**
- **Market Maturity**: Reference drug vs generic manufacturer count
- **Competitive Intensity**: Number of approved biosimilars/generics
- **Entry Momentum**: Recent approval timeline and sponsor diversity
- **Market Accessibility**: Patent cliff indicators and exclusivity status

**Output Format:**
1. **Competition Status** (3 bullets): Total manufacturers, originator vs generics, market maturity
2. **Competitive Timeline** (table): Chronological approvals with sponsor and application numbers
3. **Market Assessment** (1 paragraph): Competition intensity, recent entries, strategic implications

Execute these queries in sequence and provide a comprehensive generic competition assessment based on the Orange Book FDA analysis.`;
    return {
      description: `Generic competition assessment for ${drugIdentifier} (${providedType} name provided) using Orange Book FDA analysis`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "supply_chain_intelligence") {
    const drugName = args?.drug_name;
    const therapeuticArea = args?.therapeutic_area;
    if (!drugName && !therapeuticArea) {
      throw new Error("Either drug_name or therapeutic_area argument is required");
    }
    const analysisTarget = drugName || therapeuticArea;
    const providedType = drugName ? "drug" : "therapeutic_area";
    let prompt;
    if (therapeuticArea) {
      prompt = `Analyze supply chain risks for ${therapeuticArea} therapeutic area with these optimized queries:

1. Active shortages in ${therapeuticArea} therapeutic area:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "therapeutic_category:\\"${therapeuticArea}\\"",
       "search_type": "shortages",
       "fields_for_shortages": "generic_name,company_name,status,shortage_reason",
       "limit": 5
     }

2. Shortage patterns by therapeutic category:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "status:Current",
       "search_type": "shortages",
       "count": "therapeutic_category",
       "limit": 8
     }

3. Companies affected in ${therapeuticArea} area:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "therapeutic_category:\\"${therapeuticArea}\\" AND status:Current",
       "search_type": "shortages",
       "fields_for_shortages": "company_name",
       "limit": 5
     }

4. Shortage reasons in ${therapeuticArea} category:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "therapeutic_category:\\"${therapeuticArea}\\"",
       "search_type": "shortages",
       "fields_for_shortages": "shortage_reason",
       "limit": 5
     }

5. Upcoming supply exits (discontinuation risk):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "status:\\"To Be Discontinued\\"",
       "search_type": "shortages",
       "fields_for_shortages": "generic_name,company_name,discontinued_date",
       "limit": 3
     }`;
    } else {
      prompt = `Analyze supply chain risks for ${drugName} drug with these optimized queries:

1. Derive therapeutic area and current shortage status for ${drugName}:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "generic_name:\\"${drugName}\\"",
       "search_type": "shortages",
       "fields_for_shortages": "therapeutic_category,status,shortage_reason,company_name",
       "limit": 5
     }

Note: From the result above, use the derived therapeutic_category for subsequent therapeutic area analysis.

2. Market concentration risk for ${drugName}:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:\\"${drugName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "sponsor_name",
       "limit": 5
     }

3. Manufacturing diversity for ${drugName} formulations:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:\\"${drugName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "products.dosage_form,products.route",
       "limit": 5
     }

4. Supplier manufacturers for ${drugName}:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:\\"${drugName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "sponsor_name",
       "limit": 8
     }

5. Therapeutic area shortage patterns (use derived category from query 1):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "therapeutic_category:[DERIVED_THERAPEUTIC_CATEGORY] AND status:Current",
       "search_type": "shortages",
       "fields_for_shortages": "generic_name,company_name,shortage_reason",
       "limit": 5
     }`;
    }
    prompt += `

**Critical Parameter Guidelines:**
- Therapeutic categories are case-sensitive (use "Oncology", "Pediatric", "Cardiovascular")
- Quote multi-word status values: status:"To Be Discontinued"
- Use status:Current for active shortages (wildcards don't work for shortages)

**Analysis Framework:**
- **Active Disruptions**: Current shortages and their root causes
- **Therapeutic Vulnerability**: Categories most prone to shortages
- **Supply Concentration**: Single vs multi-supplier dependency
- **Manufacturing Resilience**: Formulation and delivery redundancy

**Output Format:**
1. **Current Supply Status** (3 bullets): Active shortages, primary causes, affected categories
2. **Risk Assessment** (table): Supplier concentration and vulnerability metrics
3. **Mitigation Strategy** (1 paragraph): Supply chain diversification and contingency recommendations

Execute these queries in sequence and provide a comprehensive supply chain risk assessment.`;
    return {
      description: `Supply chain intelligence analysis for ${analysisTarget} (${providedType} provided)`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "fda_regulatory_intelligence") {
    const drugName = args?.drug_name;
    const companyName = args?.company_name;
    if (!drugName && !companyName) {
      throw new Error("Either drug_name or company_name argument is required");
    }
    const analysisTarget = drugName || companyName;
    const providedType = drugName ? "drug" : "company";
    let prompt;
    if (drugName) {
      prompt = `Conduct comprehensive regulatory analysis for ${drugName} with these intelligence queries:

1. Core approval details and derive missing information:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${drugName.toLowerCase().includes("brand") || /^[A-Z]/.test(drugName) ? `products.brand_name:\\"${drugName}\\"` : `openfda.generic_name:\\"${drugName}\\"`}",
       "search_type": "general",
       "fields_for_general": "application_number,sponsor_name,openfda.brand_name,openfda.generic_name,products.marketing_status,submissions.submission_type,submissions.submission_status,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 1
     }

Note: From the result above, use the derived generic name (openfda.generic_name) and application number for subsequent queries.

2. Safety surveillance profile from adverse events:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:[DERIVED_GENERIC_NAME]",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 8
     }

3. Serious adverse events by demographics:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:[DERIVED_GENERIC_NAME]+AND+serious:1",
       "search_type": "adverse_events",
       "count": "patient.patientsex",
       "limit": 5
     }

4. Recent regulatory activity and submissions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "application_number:[DERIVED_APPLICATION_NUMBER]",
       "search_type": "general",
       "fields_for_general": "submissions.submission_type,submissions.submission_status,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 5
     }

5. Current supply chain status:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "generic_name:[DERIVED_GENERIC_NAME]",
       "search_type": "shortages",
       "fields_for_shortages": "status,shortage_reason,update_date",
       "limit": 3
     }`;
    } else {
      prompt = `Conduct comprehensive regulatory analysis for ${companyName} with these intelligence queries:

1. Company's drug portfolio and derive specific products:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "application_number,openfda.brand_name,openfda.generic_name,products.marketing_status,submissions.submission_type,submissions.submission_status,submissions.submission_status_date",
       "limit": 10
     }

Note: From the result above, select key products for detailed analysis in subsequent queries.

2. Company's recent regulatory submissions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\"",
       "search_type": "general",
       "fields_for_general": "submissions.submission_type,submissions.submission_status,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 10
     }

3. Safety surveillance for company's portfolio:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.openfda.manufacturer_name:\\"${companyName}\\"",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 8
     }

4. Company's supply chain disruptions:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "company_name:\\"${companyName}\\"",
       "search_type": "shortages",
       "fields_for_shortages": "generic_name,status,shortage_reason,update_date",
       "limit": 5
     }

5. Market position and competitive analysis:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "openfda.product_type",
       "limit": 5
     }`;
    }
    prompt += `

**Analysis Framework:**
- **Regulatory Pathway**: Original approval date, submission history, review classifications
- **Safety Surveillance**: Top adverse events, serious event patterns, demographic risks
- **Current Status**: Recent submissions, labeling changes, ongoing regulatory actions
- **Supply Security**: Manufacturing disruptions, shortage risks, regulatory interventions

**Output Format:**
1. **Regulatory Timeline** (table): Key approval milestones and submission history
2. **Safety Profile** (3 bullets): Top adverse events, serious event rates, risk demographics
3. **Current Status** (2 bullets): Recent regulatory activity and ongoing actions

Execute these queries in sequence and provide a comprehensive FDA regulatory intelligence analysis.`;
    return {
      description: `FDA regulatory intelligence analysis for ${analysisTarget} (${providedType} provided)`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "weekly_regulatory_monitoring") {
    const targetEntity = args?.target_entity;
    const currentDate = args?.current_date;
    if (!targetEntity) {
      throw new Error("target_entity argument is required");
    }
    if (!currentDate) {
      throw new Error("current_date argument is required");
    }
    const current = new Date(currentDate);
    const threeWeeksAgo = new Date(current);
    threeWeeksAgo.setDate(current.getDate() - 21);
    const lastWeekStart = new Date(threeWeeksAgo);
    lastWeekStart.setDate(threeWeeksAgo.getDate() - threeWeeksAgo.getDay() + 1);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    const formatDate = (date) => {
      return date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, "0") + date.getDate().toString().padStart(2, "0");
    };
    const lastWeekStartFormatted = formatDate(lastWeekStart);
    const lastWeekEndFormatted = formatDate(lastWeekEnd);
    const prompt = `Today is ${currentDate}. Create automated weekly monitoring for ${targetEntity} with these surveillance queries (using data from ${lastWeekStartFormatted} to ${lastWeekEndFormatted} accounting for FDA processing delay):

**1. Core Regulatory Intelligence** (3 queries)

1.1. Weekly regulatory activity:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "submissions.submission_status_date:[${lastWeekStartFormatted}+TO+${lastWeekEndFormatted}]",
       "search_type": "general",
       "fields_for_general": "sponsor_name,openfda.brand_name,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 10
     }

1.2. Priority review pipeline:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "submissions.review_priority:\\"PRIORITY\\"",
       "search_type": "general",
       "fields_for_general": "sponsor_name,openfda.brand_name,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 8
     }

1.3. Target entity focus:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${targetEntity}\\" OR openfda.generic_name:\\"${targetEntity}\\" OR openfda.pharm_class_epc:\\"${targetEntity}\\"",
       "search_type": "general",
       "fields_for_general": "sponsor_name,openfda.brand_name,submissions.submission_type,submissions.submission_status_date",
       "limit": 10
     }

**2. Safety Intelligence** (2 queries)

2.1. Weekly adverse events:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "receivedate:[${lastWeekStartFormatted}+TO+${lastWeekEndFormatted}]",
       "search_type": "adverse_events",
       "count": "patient.drug.medicinalproduct.exact",
       "limit": 10
     }

2.2. Targeted safety signals:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "(patient.drug.medicinalproduct:\\"${targetEntity}\\" OR patient.drug.openfda.brand_name:\\"${targetEntity}\\") AND serious:1 AND receivedate:[${lastWeekStartFormatted}+TO+${lastWeekEndFormatted}]",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 8
     }

**3. Supply Chain Intelligence** (1 query)

3.1. Targeted shortages:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "status:\\"Current\\" AND (generic_name:\\"${targetEntity}\\" OR company_name:\\"${targetEntity}\\")",
       "search_type": "shortages",
       "fields_for_shortages": "generic_name,company_name,shortage_reason,update_date",
       "limit": 10
     }

**Date Range Calculation Details:**
- Current date: ${currentDate}
- Monitoring period: ${lastWeekStartFormatted} to ${lastWeekEndFormatted} (3 weeks ago)
- Processing delay: Accounts for 2-3 week FDA data processing delay
- Format: YYYYMMDD (Year-Month-Day with no separators)

**Output Format:**
1. **Executive Summary** (3 bullet points): Key developments, emerging risks, competitive threats
2. **Regulatory Activity Table**: New approvals, submissions, status changes with dates
3. **Safety Alerts** (2 bullet points): Notable adverse event patterns, regulatory communications
4. **Strategic Implications** (1 paragraph): Impact assessment and recommended actions

Format as readable bullet points and paragraphs, not as JSON or structured data.

Execute these queries in sequence and provide a comprehensive weekly pharmaceutical regulatory intelligence report.`;
    return {
      description: `Weekly regulatory monitoring report for ${targetEntity} (period: ${lastWeekStartFormatted}-${lastWeekEndFormatted})`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else if (name === "fda_market_intelligence") {
    const drugName = args?.drug_name;
    const companyName = args?.company_name;
    if (!drugName && !companyName) {
      throw new Error("Either drug_name or company_name argument is required");
    }
    const analysisTarget = drugName || companyName;
    const providedType = drugName ? "drug" : "company";
    let prompt;
    if (drugName) {
      prompt = `Generate FDA-focused market intelligence for ${drugName} with these regulatory queries:

1. Derive complete drug information and application details:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "${drugName.toLowerCase().includes("brand") || /^[A-Z]/.test(drugName) ? `products.brand_name:\\"${drugName}\\"` : `openfda.generic_name:\\"${drugName}\\"`}",
       "search_type": "general",
       "fields_for_general": "application_number,sponsor_name,openfda.brand_name,openfda.generic_name,products.te_code,products.marketing_status",
       "limit": 1
     }

Note: From the result above, use the derived application_number and generic_name for subsequent analyses.

2. Patent protection and exclusivity timeline:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "application_number:[DERIVED_APPLICATION_NUMBER]",
       "search_type": "general",
       "fields_for_general": "application_number,products.te_code,openfda.brand_name,openfda.generic_name,products.marketing_status,submissions.submission_class_code,submissions.submission_status_date",
       "limit": 5
     }

3. Generic competition market entry risk assessment:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "sponsor_name",
       "limit": 10
     }

4. Competitive landscape and reference drug status:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.generic_name:[DERIVED_GENERIC_NAME] AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "sponsor_name,products.reference_drug,products.te_code",
       "limit": 8
     }

5. Regulatory pathway impact on market access:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "openfda.brand_name:[DERIVED_BRAND_NAME]",
       "search_type": "general",
       "fields_for_general": "submissions.submission_class_code,submissions.submission_status,submissions.submission_status_date,products.marketing_status,submissions.review_priority",
       "limit": 5
     }`;
    } else {
      prompt = `Generate FDA-focused market intelligence for ${companyName} with these regulatory queries:

1. Company portfolio and market positioning:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "application_number,openfda.brand_name,openfda.generic_name,products.te_code,products.marketing_status,submissions.submission_class_code",
       "limit": 15
     }

2. Patent cliff analysis across portfolio:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "fields_for_general": "openfda.brand_name,openfda.generic_name,products.te_code,submissions.submission_status_date",
       "limit": 10
     }

3. Generic competition exposure across key products:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription AND products.reference_drug:Yes",
       "search_type": "general",
       "fields_for_general": "openfda.brand_name,openfda.generic_name,products.te_code",
       "limit": 8
     }

4. Regulatory pathway advantages and breakthrough designations:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND (submissions.review_priority:\\"PRIORITY\\" OR submissions.submission_class_code:\\"BLA\\")",
       "search_type": "general",
       "fields_for_general": "openfda.brand_name,submissions.submission_class_code,submissions.review_priority,submissions.submission_status_date",
       "limit": 8
     }

5. Market access and competitive moats assessment:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "sponsor_name:\\"${companyName}\\" AND products.marketing_status:Prescription",
       "search_type": "general",
       "count": "products.te_code",
       "limit": 5
     }`;
    }
    prompt += `

**FDA Market Intelligence Analysis Framework:**
- **Patent Cliff Analysis**: Exclusivity timeline, TE codes, generic entry risk assessment
- **Competitive Moats**: Reference drug status, regulatory barriers, submission classifications
- **Market Positioning**: Priority review designations, breakthrough therapy status, approval pathways
- **Investment Risk Assessment**: Generic competition timeline, regulatory advantage duration

**Output Format:**
1. **Patent Protection Status** (table): TE codes, exclusivity indicators, reference drug status
2. **Competitive Moats** (3 bullets): Patent protection, regulatory barriers, market positioning advantages
3. **Investment Risk Assessment** (1 paragraph): Generic entry timeline, competitive threats, regulatory catalyst opportunities

Execute these queries in sequence and provide FDA-focused market intelligence for investment decision-making.`;
    return {
      description: `FDA market intelligence analysis for ${analysisTarget} (${providedType} provided)`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  } else {
    throw new Error(`Unknown prompt: ${name}`);
  }
});
