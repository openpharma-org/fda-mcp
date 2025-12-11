

🚨 IMPORTANT: Execute these queries EXACTLY as specified. Do not modify parameter names, field names, or syntax.

CRITICAL REQUIREMENTS:
- Copy-paste JSON examples without changes
- Validate all fields against FDA definitions before execution
- Test with limit=1 before running full queries
- Follow exact search term escaping rules
- Use only ONE field in fields_for_general parameter



FIELD VALIDATION RULES FOR GENERAL:
- fields_for_general accepts ONE field only (not comma-separated)
- count parameter must use exact field names from validation list
- All search terms with spaces must be quoted: "sponsor_name:\"Company\""
- Boolean operators require proper spacing: " AND ", " OR "

VALID COUNT FIELDS: sponsor_name, application_number, openfda.brand_name, openfda.generic_name, openfda.manufacturer_name, products.dosage_form, products.marketing_status, products.route
VALID GENERAL FIELDS (first 10): application_number, sponsor_name, openfda.application_number, openfda.brand_name, openfda.generic_name, openfda.manufacturer_name, openfda.nui, openfda.package_ndc, openfda.pharm_class_cs, openfda.pharm_class_epc...
TOTAL VALID FIELDS: 46 available



COMMON MISTAKES TO AVOID:
❌ DON'T: "count": "sponsor_name.exact"
✅ DO: "count": "sponsor_name"

❌ DON'T: "fields_for_general": "sponsor_name,openfda.brand_name"
✅ DO: "fields_for_general": "sponsor_name"

❌ DON'T: "search_term": "sponsor_name:Lilly"
✅ DO: "search_term": "sponsor_name:\"Lilly\""

❌ DON'T: "search_term": "products.marketing_status:Prescription"
✅ DO: "search_term": "products.marketing_status:Prescription" (this one is correct)

❌ DON'T: Skip field validation
✅ DO: Check field exists in field-definitions.ts

❌ DON'T: Use .exact suffix in count parameters
✅ DO: Use base field names only



WORKING EXAMPLES (copy exactly):

1. Company Application Count - Count company's prescription drug applications
   COPY THIS JSON:
   {
  "method": "lookup_drug",
  "search_term": "sponsor_name:PFIZER AND products.marketing_status:Prescription",
  "search_type": "general",
  "count": "application_number",
  "limit": 15
}

   Expected fields: application_number
   Notes: Shows company's active prescription drug portfolio size

2. Brand Names Analysis - Get company's brand names using count query
   COPY THIS JSON:
   {
  "method": "lookup_drug",
  "search_term": "sponsor_name:PFIZER AND products.marketing_status:Prescription",
  "search_type": "general",
  "count": "openfda.brand_name.exact"
}

   Expected fields: openfda.brand_name
   Notes: Count query provides brand name distribution efficiently

3. Route Specialization - Analyze company's delivery route focus
   COPY THIS JSON:
   {
  "method": "lookup_drug",
  "search_term": "openfda.manufacturer_name:PFIZER",
  "search_type": "general",
  "count": "openfda.route.exact"
}

   Expected fields: openfda.route
   Notes: Shows expertise in specific delivery methods (subcutaneous, oral, etc.)

4. Regulatory Timeline - Get complete regulatory submission timeline
   COPY THIS JSON:
   {
  "method": "lookup_drug",
  "search_term": "sponsor_name:PFIZER",
  "search_type": "general",
  "count": "submissions.submission_status_date",
  "limit": 1
}

   Expected fields: submissions.submission_status_date
   Notes: Optimized query for 95% token reduction while maintaining full timeline intelligence



EXECUTION PROTOCOL:
1. VALIDATE each query against FDA field definitions first
2. TEST with limit=1 if unsure about syntax
3. EXECUTE the full query only after validation passes
4. If any query fails, STOP and review field definitions
5. Reference src/api/field-definitions.ts for valid fields
6. Use exact JSON format from working examples

VALIDATION CHECKLIST:
□ Field name exists in getValidFields() for search type
□ Count parameter uses base field name (no .exact)
□ Search terms with company names are properly quoted
□ Only one field specified in fields_for_general
□ Boolean operators have proper spacing
□ Limit parameter is reasonable (1-50)



FIELD REFERENCE FOR GENERAL SEARCHES:

VALID COUNT FIELDS (u