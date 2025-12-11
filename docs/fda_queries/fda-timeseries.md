# None

**Source:** https://open.fda.gov/apis/timeseries/

**Fetched:** Sat Sep 20 10:00:30 BST 2025

---

## Timeseries

The API supports `count` on date fields, which produces a timeseries at the granularity of **day**. The API returns a complete timeseries.

__

**Example query**

### Counting by date, returning a timeseries

This query looks in the `drug/event` endpoint for all records. It then returns a count of records per day, according to a certain date field (the receipt date of the adverse event report).

  1. Search for all records

  2. Count the number of records per day, according to the field `receiptdate`


https://api.fda.gov/drug/event.json?count=receiptdateRun query
