# Unofficial FDA MCP Server

A comprehensive Model Context Protocol (MCP) server that provides advanced pharmaceutical intelligence through the FDA's openFDA database, Orange Book, and Purple Book. This server combines real-time data access with locally-cached patent, exclusivity, and biosimilar data to deliver actionable insights for:

- **Drug Safety & Adverse Events**: Real-time FAERS data and safety alerts
- **Patent Intelligence**: Patent cliffs, loss of exclusivity (LOE) analysis, generic entry forecasting
- **Therapeutic Equivalents**: AB-rated generic alternatives and substitutability
- **Biosimilar Intelligence**: Biosimilar approvals and interchangeability designations
- **Regulatory Intelligence**: FDA approvals, recalls, and drug shortages
- **Competitive Analysis**: Market exclusivity periods and competitive landscape

**Key Features:**
- **Fast Queries**: <10ms response time for Orange/Purple Book data after initial setup
- **Auto-Updates**: Automatic monthly data downloads and caching
- **Comprehensive Coverage**: 47,000+ drug products, 21,000+ patents, 2,000+ biologics
- **Zero Configuration**: Works out of the box with automatic data downloads

## **MCP Client Configuration**

```json
{
  "mcpServers": {
    "fda-mcp-server": {
      "command": "node",
      "args": ["/path/to/fda-mcp-server/build/index.js"],
      "env": {}
    }
  }
}
```

## What's New: Orange Book & Purple Book Integration

This server now includes comprehensive FDA Orange Book and Purple Book data for pharmaceutical intelligence:

### Orange Book (Drug Patents & Generic Equivalents)
- **47,486 drug products** with approval dates and marketing status
- **21,126 patents** with expiration dates and use codes
- **2,444 exclusivity periods** (orphan, pediatric, new clinical studies, etc.)
- **Therapeutic Equivalence (TE) Codes**: Identify AB-rated generics pharmacists can substitute
- **Patent Cliff Analysis**: Forecast generic entry dates and loss of exclusivity

### Purple Book (Biologics & Biosimilars)
- **2,168 biological products** including reference products and biosimilars
- **Interchangeability designations**: Know which biosimilars can be substituted by pharmacists
- **Licensing dates and applicants** for all biologics
- **Reference product mapping**: Links biosimilars to their reference products
- **Market exclusivity tracking** including orphan drug exclusivity

### Data Management
- **First-time setup**: ~15-20 seconds to download and build local database
- **Subsequent queries**: <10ms response time using SQLite with FTS5 full-text search
- **Auto-refresh**: Database automatically updates when older than 30 days
- **Data sources**:
  - Orange Book: Direct from FDA (monthly updates)
  - Purple Book: Latest available monthly data (works backwards from current month)

## API Reference

### Tool: `fda_info`

Unified tool for FDA drug information lookup, safety data, and pharmaceutical intelligence.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `method` | string | Yes | - | Operation type: `lookup_drug`, `search_orange_book`, `get_therapeutic_equivalents`, `get_patent_exclusivity`, `analyze_patent_cliff`, `search_purple_book`, `get_biosimilar_interchangeability` |
| `search_term` | string | Conditional | - | Search term or complex query (supports AND/OR, wildcards, ranges, field combinations) |
| `drug_name` | string | Conditional | - | Drug name for Orange/Purple Book searches |
| `nda_number` | string | Conditional | - | NDA number for patent/exclusivity lookup |
| `reference_product` | string | Conditional | - | Reference product name for biosimilar interchangeability |
| `include_generics` | boolean | No | true | Include generic products in Orange Book searches |
| `years_ahead` | integer | No | 5 | Years ahead for patent cliff analysis |
| `search_type` | string | No | `general` | Type of search: `general`, `label`, `adverse_events`, `recalls`, `shortages` |
| `fields_for_general` | string | No | - | Specific field for general drug data searches (34 available fields) |
| `fields_for_adverse_events` | string | No | - | Specific field for adverse events searches (66 available fields) |
| `fields_for_label` | string | No | - | Specific field for label searches (167 available fields) |
| `fields_for_recalls` | string | No | - | Specific field for recalls and enforcement searches (39 available fields) |
| `fields_for_shortages` | string | No | - | Specific field for drug shortages searches (44 available fields) |
| `limit` | integer | No | 10 | Maximum results to return (1-100) |

#### Methods

##### OpenFDA API Methods

###### Unified Drug Lookup (`lookup_drug`)

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

##### Orange Book Methods (Patents & Generic Equivalents)

The Orange Book provides information on drug patents, exclusivity, and therapeutic equivalence. Data is automatically downloaded and cached locally for fast queries (<10ms after initial setup).

###### Search Orange Book (`search_orange_book`)

Search for brand and generic drug products by name:

```json
{
  "method": "search_orange_book",
  "drug_name": "Lipitor",
  "include_generics": true
}
```

Returns brand products and generic alternatives with approval dates, applicants, TE codes, and marketing status.

###### Get Therapeutic Equivalents (`get_therapeutic_equivalents`)

Find AB-rated generic equivalents that are therapeutically equivalent to the reference listed drug:

```json
{
  "method": "get_therapeutic_equivalents",
  "drug_name": "fluoxetine"
}
```

Returns the Reference Listed Drug (RLD) plus all AB-rated and non-AB generics. AB-rated generics can be substituted by pharmacists.

###### Get Patent & Exclusivity Data (`get_patent_exclusivity`)

Look up all patents and exclusivity periods for a drug by NDA number:

```json
{
  "method": "get_patent_exclusivity",
  "nda_number": "020702"
}
```

Returns active patents with expiration dates, patent use codes, and FDA exclusivity periods.

###### Analyze Patent Cliff (`analyze_patent_cliff`)

Analyze when a drug will lose patent/exclusivity protection and face generic competition:

```json
{
  "method": "analyze_patent_cliff",
  "drug_name": "Trikafta",
  "years_ahead": 10
}
```

Returns patent timeline, next expiration dates, estimated generic entry date, and years until loss of exclusivity (LOE).

##### Purple Book Methods (Biologics & Biosimilars)

The Purple Book provides information on licensed biological products and biosimilar/interchangeable products. Data is automatically downloaded monthly and cached locally.

###### Search Purple Book (`search_purple_book`)

Search for biological products and their biosimilars:

```json
{
  "method": "search_purple_book",
  "drug_name": "adalimumab"
}
```

Returns the reference biological product and all approved biosimilars with licensing dates, applicants, and interchangeability status.

###### Get Biosimilar Interchangeability (`get_biosimilar_interchangeability`)

Check which biosimilars are designated as interchangeable (can be substituted by pharmacists):

```json
{
  "method": "get_biosimilar_interchangeability",
  "reference_product": "Humira"
}
```

Returns interchangeable biosimilars (pharmacy can substitute without prescriber) and similar but non-interchangeable biosimilars (requires new prescription).

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

### Orange Book - Patents and Generic Equivalents

```javascript
// Search for Prozac and its generic equivalents
{
  "method": "search_orange_book",
  "drug_name": "Prozac",
  "include_generics": true
}

// Find AB-rated therapeutically equivalent generics for fluoxetine
{
  "method": "get_therapeutic_equivalents",
  "drug_name": "fluoxetine"
}

// Get patent and exclusivity data for Lipitor (NDA 020702)
{
  "method": "get_patent_exclusivity",
  "nda_number": "020702"
}

// Analyze patent cliff for Ozempic - when will generics enter?
{
  "method": "analyze_patent_cliff",
  "drug_name": "semaglutide",
  "years_ahead": 10
}
```

### Purple Book - Biologics and Biosimilars

```javascript
// Search for Humira and all adalimumab biosimilars
{
  "method": "search_purple_book",
  "drug_name": "adalimumab"
}

// Check which biosimilars are interchangeable with Humira
{
  "method": "get_biosimilar_interchangeability",
  "reference_product": "Humira"
}

// Find all Dupixent (dupilumab) biosimilars
{
  "method": "search_purple_book",
  "drug_name": "dupilumab"
}
```

**Real-World Example Results:**

- **Ozempic (semaglutide)**: 72 active patents, first patent expires Aug 2025, but generic entry estimated Jan 2028 (2.1 years away)
- **Humira (adalimumab)**: 10 biosimilars approved, only Hyrimoz is interchangeable (since April 2025)
- **Prozac (fluoxetine)**: All patents expired, 46 AB-rated generic equivalents available
- **Trikafta**: 109 active patents, orphan exclusivity until 2031, extensive patent protection

### Available Search Fields

The API supports searching across FDA database fields total. Use field-specific parameters for targeted searches:

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