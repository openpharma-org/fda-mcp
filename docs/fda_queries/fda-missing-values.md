# None

**Source:** https://open.fda.gov/apis/missing-values/

**Fetched:** Sat Sep 20 10:00:30 BST 2025

---

## Missing (or not missing) values

  * `_missing_`: `search` modifier that matches when a field has no value (is empty).

  * `_exists_`: `search` modifier that matches when a field has a value (is not empty).


__

**Example query**

### Data is missing from a field

This query looks in the `drug/event` endpoint for records that are missing a company number, meaning that the report was submitted directly by a member of the public and not through a drug manufacturer.

  1. Search for records where the field `companynumb` is missing or empty


https://api.fda.gov/drug/event.json?search=_missing_:companynumb&limit=1Run query __

**Example query**

### Data in a field is present, regardless of the value

This query looks in the `drug/event` endpoint for records that have a company number, meaning that the report was submitted through a drug manufacturer.

  1. Search for records where the field `companynumb` has data in it


https://api.fda.gov/drug/event.json?search=_exists_:companynumb&limit=1Run query
