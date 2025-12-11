🚨 EXECUTE EXACTLY: Use the fda_info tool with the provided JSON parameters below.

📋 SCHEMA REFERENCE:
- Use the fda_info tool schema parameters: method, search_term, search_type, count, limit
- For field validation, check the tool's built-in schema validation
- Available search_type options: "general", "label", "adverse_events", "recalls", "shortages"
- count parameter accepts field names from the FDA database
- fields_for_general accepts single field names for targeted searches

Analyze NOVO competitive position with these strategic queries:

1. Company's position among pharmaceutical competitors with active prescription products:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:NOVO AND products.marketing_status:Prescription",
     "count": "application_number",
     "limit": 15
   }

2. Company's top active prescription brands and generic names:
   - Brand analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:NOVO AND products.marketing_status:Prescription",
     "count": "openfda.brand_name.exact"
   }

   - Generic analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:NOVO AND products.marketing_status:Prescription",
     "count": "openfda.generic_name.exact"
   }

3. Company's formulation specializations and delivery methods:
   - Route analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.manufacturer_name:NOVO",
     "count": "openfda.route.exact"
   }

   - Dosage form analysis - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "openfda.manufacturer_name:NOVO",
     "count": "products.dosage_form.exact"
   }

4. Company's complete regulatory submissions:
   - Tool: fda_info
   - EXECUTE EXACTLY:
   {
     "method": "lookup_drug",
     "search_term": "sponsor_name:NOVO",
     "count": "submissions.submission_status_date",
     "limit": 1
   }

notes:
- Portfolio strength: Active prescription drugs vs discontinued products
- Regulatory momentum: Recent approvals/submissions in past 2 years
- Competitive focus: Dosage form specialization and therapeutic class concentration

**Output Format:**
1. **Market Position** (1 paragraph): Company's position, relative size, competitive tier
2. **Full Portfolio** (table): All products with status and approval dates and all
3. **Strategic Assessment** (2 paragraphs): Regulatory activity, dosage focus, competitive advantages

Execute each query sequentially and provide comprehensive competitive intelligence covering market positioning, portfolio analysis, and strategic assessment for pharmaceutical competitive analysis.