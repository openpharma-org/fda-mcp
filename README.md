# FDA MCP Server

[![npm version](https://badge.fury.io/js/%40uh-joan%2Ffda-mcp-server.svg)](https://badge.fury.io/js/%40uh-joan%2Ffda-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Model Context Protocol (MCP) server that provides advanced pharmaceutical intelligence through the FDA's openFDA database. This server combines real-time data access, intelligent analysis prompts, and executive-level resources to deliver actionable insights for drug safety, regulatory intelligence, competitive analysis, and supply chain risk assessment.

## Features

### 🛠️ **Core Tool**
- 🔍 **FDA Database Access**: Unified tool for searching across ALL FDA database fields with advanced query capabilities
- 🧠 **Complex Query Support**: Boolean operators (AND, OR), field combinations, range queries, wildcards, and special modifiers
- 🎯 **Multi-Database Search**: Access drug labels, adverse events, recalls, shortages, and regulatory data
- 🔄 **Field-Specific Targeting**: 350+ searchable fields across all FDA databases

### 📋 **Intelligent Analysis Prompts (7 Available)**
- 🩺 **FDA Drug Safety Profile**: Comprehensive adverse event analysis with demographics and risk patterns
- 🏢 **FDA Company Portfolio Analysis**: Competitive intelligence and market position analysis
- 🔀 **FDA Generic Competition Landscape**: Generic vs. brand drug competition assessment
- 📦 **FDA Supply Chain Risk Assessment**: Shortage vulnerability and manufacturing resilience analysis
- 📋 **FDA Regulatory Due Diligence**: Multi-factor regulatory intelligence for business decisions
- 📈 **FDA Market Access Analysis**: Patent protection, regulatory pathways, and market barriers
- 📊 **FDA Weekly Surveillance Report**: Automated monitoring across regulatory activity and safety signals

### 📊 **Executive Intelligence Resources (5 Available)**
- 🚨 **Current Safety Alerts**: Real-time black box warnings and Class I recalls with risk assessment
- 📈 **Trending Adverse Events**: Top drugs by recent adverse event volume with statistical analysis
- 🏥 **Active Recalls**: Comprehensive recall analysis by classification with impact assessment
- 💊 **Current Shortages**: Real-time drug shortage tracking with operational details
- ⚠️ **High-Risk Therapeutic Areas**: Multi-factor risk analysis combining shortages, safety, and discontinuation data

### ⚙️ **Advanced Configuration**
- 🎛️ **Configurable Components**: Enable/disable individual tools, prompts, and resources via JSON configuration
- 🔧 **Settings Management**: Comprehensive configuration system with validation and fallbacks
- 📊 **Dynamic Registration**: Components register conditionally based on configuration settings

## Installation

### Option 1: Install from NPM

```bash
npm install -g @uh-joan/fda-mcp-server
```

### Option 2: Install from Source

```bash
git clone https://github.com/uh-joan/fda-mcp-server.git
cd fda-mcp-server
npm install
npm link
```

## Configuration

### Claude Desktop Integration

Add the following to your Claude Desktop configuration file:

**Location:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "fda": {
      "command": "fda-mcp-server",
      "env": {
        "FDA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Advanced Configuration

The server uses a comprehensive configuration system via `fda-config.json` in the project root:

```json
{
  "server": {
    "name": "FDA MCP Server",
    "version": "1.0.0",
    "enableLogging": true,
    "logLevel": "info"
  },
  "features": {
    "tools": {
      "enabled": true,
      "fda_info": {
        "enabled": true,
        "description": "Core FDA database lookup tool"
      }
    },
    "prompts": {
      "enabled": true,
      "fda_drug_safety_profile": { "enabled": true },
      "fda_company_portfolio_analysis": { "enabled": true },
      "fda_generic_competition_landscape": { "enabled": true },
      "fda_supply_chain_risk_assessment": { "enabled": true },
      "fda_regulatory_due_diligence": { "enabled": true },
      "fda_market_access_analysis": { "enabled": true },
      "fda_weekly_surveillance_report": { "enabled": true }
    },
    "resources": {
      "enabled": true,
      "current_safety_alerts": { "enabled": true },
      "trending_adverse_events": { "enabled": true },
      "active_recalls": { "enabled": true },
      "current_shortages": { "enabled": true },
      "high_risk_therapeutic_areas": { "enabled": true }
    }
  }
}
```

### Environment Variables

- `FDA_API_KEY` (optional): Your FDA API key for higher rate limits. Register at https://open.fda.gov/apis/
- `LOG_LEVEL` (optional): Set logging level (`debug`, `info`, `warn`, `error`)

## API Reference

### Tool: `fda_info`

Unified tool for FDA drug information lookup and safety data.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `method` | string | Yes | - | Operation type: `lookup_drug` |
| `search_term` | string | Yes | - | Search term or complex query (supports AND/OR, wildcards, ranges, field combinations) |
| `search_type` | string | No | `general` | Type of search: `general`, `label`, `adverse_events`, `recalls`, `shortages` |
| `fields_for_general` | string | No | - | Specific field for general drug data searches (34 available fields) |
| `fields_for_adverse_events` | string | No | - | Specific field for adverse events searches (66 available fields) |
| `fields_for_label` | string | No | - | Specific field for label searches (167 available fields) |
| `fields_for_recalls` | string | No | - | Specific field for recalls and enforcement searches (39 available fields) |
| `fields_for_shortages` | string | No | - | Specific field for drug shortages searches (44 available fields) |
| `limit` | integer | No | 10 | Maximum results to return (1-100) |

#### Methods

##### Unified Drug Lookup (`lookup_drug`)

Search for comprehensive drug information with different search types and optional field targeting:

**Comprehensive Search (All Fields):**
```json
{
  "method": "lookup_drug",
  "search_term": "aspirin",
  "search_type": "general"
}
```

**Field-Specific Search:**
```json
{
  "method": "lookup_drug",
  "search_term": "Discontinued",
  "search_type": "general",
  "fields_for_general": "products.marketing_status"
}
```

**Complex Boolean Query:**
```json
{
  "method": "lookup_drug",
  "search_term": "openfda.generic_name:aspirin+AND+products.dosage_form:TABLET",
  "search_type": "general"
}
```

**Drug Labels and Prescribing Information:**
```json
{
  "method": "lookup_drug",
  "search_term": "Lipitor",
  "search_type": "label"
}
```

**Label Field-Specific Search:**
```json
{
  "method": "lookup_drug",
  "search_term": "pregnancy",
  "search_type": "label",
  "fields_for_label": "warnings"
}
```

**Adverse Events and Safety Data:**
```json
{
  "method": "lookup_drug",
  "search_term": "metformin",
  "search_type": "adverse_events",
  "limit": 25
}
```

**Drug Recalls and Safety Alerts:**
```json
{
  "method": "lookup_drug",
  "search_term": "insulin",
  "search_type": "recalls",
  "limit": 20
}
```

**Drug Shortages:**
```json
{
  "method": "lookup_drug",
  "search_term": "bupivacaine",
  "search_type": "shortages",
  "limit": 10
}
```

## Complex Query Syntax

The FDA MCP Server supports powerful openFDA query syntax for advanced searches:

### Boolean Operators

**AND Queries** - Find results matching multiple criteria:
```json
{
  "method": "lookup_drug",
  "search_term": "openfda.generic_name:ibuprofen+AND+products.dosage_form:TABLET",
  "search_type": "general"
}
```

**OR Queries** - Find results matching any criteria:
```json
{
  "method": "lookup_drug",
  "search_term": "openfda.generic_name:ibuprofen+OR+openfda.brand_name:advil",
  "search_type": "general"
}
```

### Wildcard Patterns

**Prefix wildcards** - Find names starting with a pattern:
```json
{
  "method": "lookup_drug",
  "search_term": "child*",
  "search_type": "general",
  "fields_for_general": "openfda.brand_name"
}
```

**General wildcards** - Find any field containing a pattern:
```json
{
  "method": "lookup_drug",
  "search_term": "*5*",
  "search_type": "general"
}
```

### Range Queries

**Age ranges** - Find adverse events for specific age groups:
```json
{
  "method": "lookup_drug",
  "search_term": "patient.patientonsetage:[65+TO+*]",
  "search_type": "adverse_events"
}
```

**Date ranges** - Find events within date ranges:
```json
{
  "method": "lookup_drug",
  "search_term": "receiptdate:[2023-01-01+TO+2023-12-31]",
  "search_type": "adverse_events"
}
```

### Special Modifiers

**Field exists** - Find records where a field has any value:
```json
{
  "method": "lookup_drug",
  "search_term": "_exists_:serious",
  "search_type": "adverse_events"
}
```

**Field missing** - Find records where a field is empty:
```json
{
  "method": "lookup_drug",
  "search_term": "_missing_:companynumb",
  "search_type": "adverse_events"
}
```

### Complex Multi-Field Examples

**Advanced adverse events** - Serious events in elderly patients:
```json
{
  "method": "lookup_drug",
  "search_term": "patient.drug.medicinalproduct:acetaminophen+AND+serious:1+AND+patient.patientonsetage:[65+TO+*]",
  "search_type": "adverse_events"
}
```

**Grouped conditions** - Multiple drug names with conditions:
```json
{
  "method": "lookup_drug",
  "search_term": "(patient.drug.medicinalproduct:(cetirizine+OR+loratadine))+AND+serious:2",
  "search_type": "adverse_events"
}
```

**Geographic filtering** - Events by country with drug and severity:
```json
{
  "method": "lookup_drug",
  "search_term": "occurcountry:US+AND+patient.drug.medicinalproduct:lipitor+AND+serious:1",
  "search_type": "adverse_events"
}
```

## Usage Examples

### Comprehensive Drug Search (All Fields)

```javascript
// Search across all FDA database fields (267 total fields)
{
  "method": "lookup_drug",
  "search_term": "aspirin",
  "search_type": "general"
}
```

### Field-Specific Searches

**General Search Fields (34 available):**
```javascript
// Find all discontinued drugs
{
  "method": "lookup_drug",
  "search_term": "Discontinued",
  "search_type": "general",
  "fields_for_general": "products.marketing_status"
}

// Search by manufacturer
{
  "method": "lookup_drug",
  "search_term": "Pfizer",
  "search_type": "general",
  "fields_for_general": "openfda.manufacturer_name"
}

// Find drugs by dosage form
{
  "method": "lookup_drug",
  "search_term": "TABLET",
  "search_type": "general",
  "fields_for_general": "products.dosage_form"
}
```

**Adverse Events Fields (66 available):**
```javascript
// Find headache reactions
{
  "method": "lookup_drug",
  "search_term": "headache",
  "search_type": "adverse_events",
  "fields_for_adverse_events": "patient.reaction.reactionmeddrapt"
}

// Find serious adverse events
{
  "method": "lookup_drug",
  "search_term": "1",
  "search_type": "adverse_events",
  "fields_for_adverse_events": "serious"
}

// Find events by patient gender (1=male, 2=female)
{
  "method": "lookup_drug",
  "search_term": "1",
  "search_type": "adverse_events",
  "fields_for_adverse_events": "patient.patientsex"
}
```

**Label Search Fields (167 available):**
```javascript
// Find labels with specific warnings
{
  "method": "lookup_drug",
  "search_term": "pregnancy",
  "search_type": "label",
  "fields_for_label": "warnings"
}

// Search for drug interactions
{
  "method": "lookup_drug",
  "search_term": "warfarin",
  "search_type": "label",
  "fields_for_label": "drug_interactions"
}

// Find dosage information for specific conditions
{
  "method": "lookup_drug",
  "search_term": "pediatric",
  "search_type": "label",
  "fields_for_label": "dosage_and_administration"
}
```

**Recalls Fields (39 available):**
```javascript
// Find recalls by recalling firm
{
  "method": "lookup_drug",
  "search_term": "Pfizer",
  "search_type": "recalls",
  "fields_for_recalls": "recalling_firm"
}

// Find Class I recalls (most serious)
{
  "method": "lookup_drug",
  "search_term": "I",
  "search_type": "recalls",
  "fields_for_recalls": "classification"
}

// Search recalls by product description
{
  "method": "lookup_drug",
  "search_term": "tablet",
  "search_type": "recalls",
  "fields_for_recalls": "product_description"
}
```

**Shortages Fields (44 available):**
```javascript
// Find current shortages by status
{
  "method": "lookup_drug",
  "search_term": "Currently+in+Shortage",
  "search_type": "shortages",
  "fields_for_shortages": "status"
}

// Search shortages by therapeutic category
{
  "method": "lookup_drug",
  "search_term": "CEPHALOSPORIN",
  "search_type": "shortages",
  "fields_for_shortages": "therapeutic_category"
}

// Find shortages by company name
{
  "method": "lookup_drug",
  "search_term": "Pfizer",
  "search_type": "shortages",
  "fields_for_shortages": "company_name"
}
```

### Detailed Drug Label

```javascript
// Get FDA-approved prescribing information for Tylenol
{
  "method": "lookup_drug",
  "search_term": "Tylenol",
  "search_type": "label"
}
```

### Safety and Adverse Events

```javascript
// Check adverse events for ibuprofen
{
  "method": "lookup_drug",
  "search_term": "ibuprofen",
  "search_type": "adverse_events"
}
```

### Drug Recalls

```javascript
// Search for recalls related to blood pressure medications
{
  "method": "lookup_drug",
  "search_term": "lisinopril",
  "search_type": "recalls",
  "limit": 10
}
```

### Drug Shortages

```javascript
// Monitor current drug supply shortages
{
  "method": "lookup_drug",
  "search_term": "bupivacaine",
  "search_type": "shortages",
  "limit": 10
}
```

### Available Search Fields

The API supports searching across 350+ FDA database fields total. Use field-specific parameters for targeted searches:

- **`fields_for_general`**: 34 fields for general drug data searches
- **`fields_for_adverse_events`**: 66 fields for adverse events searches
- **`fields_for_label`**: 167 fields for drug label searches
- **`fields_for_recalls`**: 39 fields for recalls and enforcement searches
- **`fields_for_shortages`**: 44 fields for drug shortages searches

#### OpenFDA Section (16 fields)
- `openfda.application_number` - FDA application number
- `openfda.brand_name` - Brand/trade name of the drug
- `openfda.generic_name` - Generic name of the drug
- `openfda.manufacturer_name` - Name of the manufacturer
- `openfda.nui` - Numeric identifier for ingredients
- `openfda.package_ndc` - Package-level National Drug Code
- `openfda.pharm_class_cs` - Chemical structure pharmacologic class
- `openfda.pharm_class_epc` - Established pharmacologic class
- `openfda.pharm_class_pe` - Physiologic effect pharmacologic class
- `openfda.pharm_class_moa` - Mechanism of action pharmacologic class
- `openfda.product_ndc` - Product-level National Drug Code
- `openfda.route` - Route of administration
- `openfda.rxcui` - RxNorm concept unique identifier
- `openfda.spl_id` - Structured Product Labeling identifier
- `openfda.spl_set_id` - SPL document set identifier
- `openfda.substance_name` - Name of the active substance
- `openfda.unii` - Unique Ingredient Identifier

#### Products Section (9 fields)
- `products.active_ingredients.name` - Name of active ingredient
- `products.active_ingredients.strength` - Strength of active ingredient
- `products.dosage_form` - Dosage form (e.g., "TABLET", "CAPSULE")
- `products.marketing_status` - Marketing status (e.g., "Discontinued", "Prescription")
- `products.product_number` - Product number within application
- `products.reference_drug` - Reference drug designation
- `products.reference_standard` - Reference standard designation
- `products.route` - Route of administration
- `products.te_code` - Therapeutic equivalence evaluation code

#### Submissions Section (10+ fields)
- `submissions.application_docs` - Application documentation
- `submissions.review_priority` - Review priority designation
- `submissions.submission_class_code` - Submission classification code
- `submissions.submission_class_code_description` - Description of submission class
- `submissions.submission_number` - Sequential submission number
- `submissions.submission_property_type.code` - Property type code
- `submissions.submission_public_notes` - Public notes about submission
- `submissions.submission_status` - Current status of submission
- `submissions.submission_status_date` - Date of status change
- `submissions.submission_type` - Type of submission

#### Usage Examples by Field Type

**Search by Marketing Status:**
```json
{
  "method": "lookup_drug",
  "search_term": "Discontinued",
  "search_type": "general",
  "fields_for_general": "products.marketing_status"
}
```

**Search by Manufacturer:**
```json
{
  "method": "lookup_drug",
  "search_term": "Pfizer",
  "search_type": "general", 
  "fields_for_general": "openfda.manufacturer_name"
}
```

**Search by Dosage Form:**
```json
{
  "method": "lookup_drug",
  "search_term": "INJECTION",
  "search_type": "general",
  "fields_for_general": "products.dosage_form"
}
```

**Search by Active Ingredient:**
```json
{
  "method": "lookup_drug",
  "search_term": "acetaminophen",
  "search_type": "general",
  "fields_for_general": "products.active_ingredients.name"
}
```

## Response Format

All responses include:

```json
{
  "success": true,
  "query": "aspirin",
  "search_type": "general",
  "total_results": 150,
  "results": [...],
  "metadata": {
    "total": 150,
    "skip": 0,
    "limit": 10
  }
}
```

## Search Tips

### Drug Names
- Use both **generic names** (e.g., "acetaminophen") and **brand names** (e.g., "Tylenol")
- Try different name variations if initial search returns no results
- Include common spellings and abbreviations
- Use wildcards for partial matches (e.g., `child*` for children's medications)

### Search Types
- **`general`**: Comprehensive search across all FDA database fields (34 fields available)
- **`label`**: Detailed prescribing information and FDA-approved labels (167 fields available)
- **`adverse_events`**: Safety data and adverse reaction reports (66 fields available)
- **`recalls`**: Drug recalls and safety alerts (39 fields available)
- **`shortages`**: Current drug supply shortages and availability (44 fields available)

### Complex Query Strategies
- **Boolean Logic**: Combine conditions with `AND`/`OR` operators
- **Field Targeting**: Use `openfda.field_name:value` syntax for precise searches
- **Range Queries**: Use `[min+TO+max]` for age, date, or numeric ranges
- **Wildcards**: Use `*` for pattern matching (`*5*`, `MEF*`)
- **Special Modifiers**: Use `_exists_:field` or `_missing_:field` for data completeness

### Field-Specific Searching
- Use `fields_for_general` for general drug data (34 options)
- Use `fields_for_adverse_events` for adverse events (66 options)
- Use `fields_for_label` for drug label searches (167 options)
- Use `fields_for_recalls` for recalls and enforcement (39 options)
- Use `fields_for_shortages` for drug shortages (44 options)
- Examples: `products.marketing_status`, `patient.reaction.reactionmeddrapt`, `warnings`, `recalling_firm`, `status`
- Enables precise queries like finding discontinued drugs, specific adverse reactions, label warnings, recall classifications, or shortage statuses

### Advanced Query Examples
- **Multi-condition**: `drug:aspirin+AND+form:TABLET+AND+status:active`
- **Age-specific**: `patient.patientonsetage:[18+TO+65]` for adults
- **Geographic**: `occurcountry:US+AND+serious:1` for US serious events
- **Time-based**: `receiptdate:[2023-01-01+TO+2023-12-31]` for 2023 data

### Optimizing Results
- Start with simple queries, then add complexity as needed
- Use comprehensive search (no field specified) for broad drug discovery
- Use field-specific search for targeted queries
- Start with brand names for better label results
- Use generic names for broader adverse event data
- Try complex boolean queries for research-grade specificity
- Check both generic and brand names for comprehensive information

## Intelligent Analysis Prompts

The server provides 7 specialized prompts for pharmaceutical intelligence analysis:

### 🩺 **FDA Drug Safety Profile** (`fda_drug_safety_profile`)
Comprehensive adverse event analysis using FAERS database.
- **Input**: Drug name (generic or brand)
- **Output**: Safety profile with demographics, reaction patterns, and risk assessment
- **Use Cases**: Pharmacovigilance, safety monitoring, regulatory submissions

### 🏢 **FDA Company Portfolio Analysis** (`fda_company_portfolio_analysis`)
Competitive intelligence and market position analysis.
- **Input**: Company name
- **Output**: Portfolio analysis, market positioning, and regulatory activity
- **Use Cases**: Business development, competitive intelligence, market research

### 🔀 **FDA Generic Competition Landscape** (`fda_generic_competition_landscape`)
Generic vs. brand drug competition assessment.
- **Input**: Brand or generic drug name
- **Output**: Competitive landscape, market maturity, reference vs. generic analysis
- **Use Cases**: Market entry analysis, investment decisions, strategic planning

### 📦 **FDA Supply Chain Risk Assessment** (`fda_supply_chain_risk_assessment`)
Shortage vulnerability and manufacturing resilience analysis.
- **Input**: Drug name or therapeutic area
- **Output**: Supply chain risks, shortage patterns, vulnerability assessment
- **Use Cases**: Supply chain management, risk mitigation, sourcing decisions

### 📋 **FDA Regulatory Due Diligence** (`fda_regulatory_due_diligence`)
Multi-factor regulatory intelligence for business decisions.
- **Input**: Drug name or company name
- **Output**: Regulatory profile, approval timeline, safety surveillance data
- **Use Cases**: Investment due diligence, M&A analysis, regulatory strategy

### 📈 **FDA Market Access Analysis** (`fda_market_access_analysis`)
Patent protection, regulatory pathways, and market barriers analysis.
- **Input**: Drug name or company name
- **Output**: Market access assessment, regulatory pathways, competitive barriers
- **Use Cases**: Market access strategy, investment analysis, business planning

### 📊 **FDA Weekly Surveillance Report** (`fda_weekly_surveillance_report`)
Automated monitoring across regulatory activity and safety signals.
- **Input**: Company, therapeutic area, drug name, or brand name
- **Output**: Weekly surveillance report with regulatory and safety intelligence
- **Use Cases**: Ongoing monitoring, regulatory surveillance, competitive tracking

## Executive Intelligence Resources

The server provides 5 real-time intelligence resources:

### 🚨 **Current Safety Alerts** (`fda://safety/alerts/current`)
Real-time black box warnings and Class I recalls with structured risk assessment.
- **Data Source**: FDA Drug Labels + Enforcement Database
- **Content**: Critical safety alerts, risk categorization, recommended actions
- **Update Frequency**: Real-time on access

### 📈 **Trending Adverse Events** (`fda://safety/top-drugs-aes`)
Top drugs by recent adverse event volume with statistical analysis.
- **Data Source**: FAERS Database (last 30 days)
- **Content**: Top 10 drugs by adverse event count, trend analysis, statistical insights
- **Update Frequency**: Real-time rolling 30-day window

### 🏥 **Active Recalls** (`fda://recalls/active`)
Comprehensive recall analysis by classification with impact assessment.
- **Data Source**: FDA Enforcement Database
- **Content**: Class I/II/III recalls, distribution patterns, health risk assessment
- **Update Frequency**: Real-time from FDA enforcement actions

### 💊 **Current Shortages** (`fda://shortages/current`)
Real-time drug shortage tracking with operational details.
- **Data Source**: FDA Drug Shortage Database
- **Content**: Active shortages, NDC codes, therapeutic categories, company information
- **Update Frequency**: Real-time from FDA shortage database

### ⚠️ **High-Risk Therapeutic Areas** (`fda://intelligence/high-risk-therapeutic-areas`)
Multi-factor risk analysis combining shortages, safety, and discontinuation data.
- **Data Source**: Multi-database analysis (Shortages + FAERS + Drugs@FDA)
- **Content**: Risk-ranked therapeutic areas, convergence analysis, strategic insights
- **Update Frequency**: Real-time multi-factor calculation

## Rate Limits

- **Without API Key**: 240 requests per minute, 1,000 requests per day
- **With API Key**: 120,000 requests per day (register at https://open.fda.gov/apis/)

## Development

### Setup
```bash
git clone https://github.com/uh-joan/fda-mcp-server.git
cd fda-mcp-server
npm install
```

### Testing
```bash
# Test the server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node src/index.js

# Test with a drug lookup
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fda_info","arguments":{"method":"lookup_drug","search_term":"aspirin"}}}' | node src/index.js
```

### File Structure
```
fda-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── api/                  # FDA API client and utilities
│   │   ├── client.ts         # FDA API client with rate limiting
│   │   └── transform.ts      # Data transformation utilities
│   ├── config/               # Configuration management
│   │   └── settings.ts       # Settings manager and validation
│   ├── errors/               # Error handling
│   │   └── index.ts          # Custom error classes
│   ├── logging/              # Logging infrastructure
│   │   └── index.ts          # Logger configuration
│   ├── prompts/              # Intelligent analysis prompts
│   │   ├── base.ts           # Base prompt classes
│   │   ├── enhanced-base.ts  # Enhanced prompt with validation
│   │   ├── drug-safety.ts    # FDA Drug Safety Profile
│   │   ├── competitive-intel.ts # FDA Company Portfolio Analysis
│   │   ├── generic-competition.ts # FDA Generic Competition Landscape
│   │   ├── supply-chain.ts   # FDA Supply Chain Risk Assessment
│   │   ├── regulatory-intel.ts # FDA Regulatory Due Diligence
│   │   ├── market-intel.ts   # FDA Market Access Analysis
│   │   ├── weekly-monitoring.ts # FDA Weekly Surveillance Report
│   │   └── index.ts          # Prompt registry and registration
│   ├── resources/            # Executive intelligence resources
│   │   ├── base.ts           # Base resource classes
│   │   ├── current-safety-alerts.ts # Current Safety Alerts
│   │   ├── trending-adverse-events.ts # Trending Adverse Events
│   │   ├── active-recalls.ts # Active Recalls
│   │   ├── current-shortages.ts # Current Shortages
│   │   ├── high-risk-therapeutic-areas.ts # High-Risk Therapeutic Areas
│   │   └── index.ts          # Resource registry and registration
│   ├── servers/              # MCP server implementations
│   │   └── fda-mcp.ts        # FDA MCP server implementation
│   ├── tools/                # MCP tools
│   │   ├── base.ts           # Base tool classes
│   │   ├── fda-info.ts       # FDA database lookup tool
│   │   └── index.ts          # Tool registry and registration
│   ├── types/                # TypeScript type definitions
│   │   └── fda.ts            # FDA API and schema types
│   └── utils/                # Utility functions
│       ├── cache.ts          # Caching utilities
│       └── registry.ts       # Component registry utilities
├── build/                    # Compiled JavaScript output
├── scripts/                  # Build and utility scripts
├── tests/                    # Test files
├── docs/                     # Documentation
├── fda-config.json          # Server configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project configuration
├── README.md               # Documentation
└── LICENSE                 # MIT License
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [PubMed MCP Server](https://github.com/uh-joan/pubmed-mcp-server) - Access biomedical literature
- [Model Context Protocol](https://github.com/modelcontextprotocol) - Learn more about MCP

## Support

- 📧 **Issues**: [GitHub Issues](https://github.com/uh-joan/fda-mcp-server/issues)
- 📖 **FDA API Documentation**: [openFDA API](https://open.fda.gov/apis/)
- 🔧 **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)

---

Built with ❤️ for safer medication information access