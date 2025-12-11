# None

**Source:** https://open.fda.gov/apis/query-syntax/

**Fetched:** Sat Sep 20 10:00:28 BST 2025

---

## Query syntax

Queries to the openFDA API are made up of **parameters** joined by an ampersand `&`. Each parameter is followed by an equals sign `=` and an argument.

Searches have a special syntax: `search=field:term`. Note that there is only one equals sign `=` and there is a colon `:` between the field to search, and the term to search for.

Here are a few syntax patterns that may help if you’re new to this API.

  * `search=field:term`: Search within a specific `field` for a `term`.

  * `search=field:term+AND+field:term`: Search for records that match **both** terms.

  * `search=field:term+field:term`: Search for records that match **either** of two terms.

  * `sort=report_date:desc`: Sort records by a specific `field` in descending order.

  * `search=field:term&count=another_field`: Search for matching records. Then within that set of records, count the number of times that the unique values of a field appear. Instead of looking at individual records, you can use the `count` parameter to count how often certain terms (like drug names or patient reactions) appear in the matching set of records.




Here are some example queries that demonstrate how these searches and the `count` parameter work, all using the drug adverse events endpoint.

__

**Example query**

### Matching a single search term

This query looks in the `drug/event` endpoint for a record where one of the reported patient reactions was fatigue.

  1. Search for records where the field `patient.reaction.reactionmeddrapt` (patient reaction) contains **fatigue**


https://api.fda.gov/drug/event.json?search=patient.reaction.reactionmeddrapt:"fatigue"&limit=1Run query __

**Example query**

### Matching all search terms

This query looks in the `drug/event` endpoint for a record where **both** fatigue was a reported patient reaction **and** the country in which the event happened was Canada. The key here is the `+AND+` that joins the two search terms.

  1. Search for records where the field `patient.reaction.reactionmeddrapt` (patient reaction) contains **fatigue** and `occurcountry` (country where the event happened) was **ca** (the country code for Canada)


https://api.fda.gov/drug/event.json?search=patient.reaction.reactionmeddrapt:"fatigue"+AND+occurcountry:"ca"&limit=1Run query __

**Example query**

### Matching any search terms

This query looks in the `drug/event` endpoint for a record where **either** fatigue was a reported patient reaction **or** the country in which the event happened was Canada.

  1. Search for records where the field `patient.reaction.reactionmeddrapt` (patient reaction) contains **fatigue** or `occurcountry` (country where the event happened) was **ca** (the country code for Canada)


https://api.fda.gov/drug/event.json?search=patient.reaction.reactionmeddrapt:"fatigue"+occurcountry:"ca"&limit=1Run query __

**Example query**

### Sort in descending order

This query looks in the `drug/event` endpoint for ten records and sorts them in descending order by received date.

  1. Search for ten records

  2. Sort the results in descending order

  3. Sort by the field `receivedate`


https://api.fda.gov/drug/event.json?sort=receivedate:desc&limit=10Run query __

**Example query**

### Counting records where certain terms occur

This query looks in the `drug/event` endpoint for all records. It then returns a count of the top patient reactions. For each reaction, the number of records that matched is summed, providing a useful summary.

  1. Search for all records

  2. Count the number of records matching the terms in `patient.reaction.reactionmeddrapt.exact`. The `.exact` suffix here tells the API to count whole phrases (e.g. **injection site reaction**) instead of individual words (e.g. **injection** , **site** , and **reaction** separately)


https://api.fda.gov/drug/event.json?count=patient.reaction.reactionmeddrapt.exactRun query
