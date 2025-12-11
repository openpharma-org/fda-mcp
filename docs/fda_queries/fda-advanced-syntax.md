# None

**Source:** https://open.fda.gov/apis/advanced-syntax/

**Fetched:** Sat Sep 20 10:00:29 BST 2025

---

## Advanced syntax

### Spaces

Queries use the plus sign `+` in place of the space character. Wherever you would use a space character, use a plus sign instead.

### Phrase matches

For phrase matches, use double quotation marks `" "` around the words. For example, `"multiple+myeloma"`.

### Grouping

To group several terms together, use parentheses `(` `)`. For example, `patient.drug.medicinalproduct:(cetirizine+OR+loratadine+OR+diphenhydramine)`. To join terms as in a boolean AND, use the term `+AND+`. For example, `(patient.drug.medicinalproduct:(cetirizine+OR+loratadine+OR+diphenhydramine))+AND+serious:2` requires that _any_ of the drug names match _and_ that the field `serious` also match.
