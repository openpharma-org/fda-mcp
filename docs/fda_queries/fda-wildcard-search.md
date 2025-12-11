# None

**Source:** https://open.fda.gov/apis/wildcard-search/

**Fetched:** Sat Sep 20 10:00:29 BST 2025

---

## Wildcard search

Wildcard queries return data that contain terms matching a wildcard pattern.

A wildcard operator is a placeholder that matches one or more characters. At this point, openFDA supports the `*` ("star") wildcard operator, which matches zero or more characters. You can combine wildcard operators with other characters to create a wildcard pattern.

**This feature is available on all API Endpoints.**

Here are some example queries that demonstrate how wildcard searches work.

__

**Example query**

### Wildcard search against a regular field, case insensitive

This example query looks in the `drug/ndc` endpoint for drugs where `brand_name` contains words that begin with `child`, case insensitive. This will include drugs with brand names that contain "Child", "Children", "Childrens" among others.

  1. Search for records where the field `brand_name` contains `child*`, case-insensitive


https://api.fda.gov/drug/ndc.json?search=brand_name:child*&limit=10Run query __

**Example query**

### Wildcard search against an exact field, case sensitive

This example query looks in the `drug/ndc` endpoint for drugs where `brand_name` matches the following pattern, case sensitive: `*Night*Cough*Max*`. This will produce results including "Tussin DM Nighttime Cough Maximum Strength", "Day and Night Severe Sinus Congestion and Cough Maximum Strength" among others. Since an `exact` field is being used, the entire field value must match the pattern in a case-sensitive fashion.

  1. Search for records where the entire field `brand_name.exact` (case-sensitive brand name) matches `*Night*Cough*Max*`


https://api.fda.gov/drug/ndc.json?search=brand_name.exact:*Night*Cough*Max*&limit=10Run query __

**Example query**

### Wildcard search against a regular field, case insensitive

This example query looks in the `food/enforcement` endpoint for recalls where `recalling_firm` contains words that contain `natur`, case insensitive. This will include organization names that contain "Natural", "Nature", "Natures" among others.

  1. Search for records where the field `recalling_firm` contains `*natur*`, case-insensitive


https://api.fda.gov/food/enforcement.json?search=recalling_firm:*natur*&limit=10Run query __

**Example query**

### Wildcard search against an exact field, case sensitive

This example query looks in the `food/enforcement` endpoint for recalls where `recall_number` matches the `F-*-2023` pattern, case sensitive.

  1. Search for records where `recall_number` matches `F-*-2023` exactly


https://api.fda.gov/food/enforcement.json?search=recall_number.exact:F-*-2023&limit=10Run query
