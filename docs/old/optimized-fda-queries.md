# FDA API Optimized Queries Guide

## Advanced Query Optimization Strategies

This guide provides optimized FDA API queries designed to minimize token usage while maximizing pharmaceutical intelligence value.

## 1. Company Latest Regulatory Submissions (Optimized)

### Ultra-Efficient Count Query (Minimal Tokens)
```
Method: lookup_drug
Search: sponsor_name:NOVO
Count: submissions.submission_status_date
Limit: 0
```
**Result**: Time-series count of submission activity (~100-500 characters)
**Use Case**: Quick submission activity timeline for competitive intelligence

### Recent Activity Summary (Balanced)
```
Method: lookup_drug
Search: sponsor_name:NOVO
Search Type: general
Limit: 1
```
**Result**: Latest application with full submission history (~13KB)
**Use Case**: Detailed regulatory intelligence for most recent activity

### Multi-Company Comparison (Efficient)
```
Method: lookup_drug
Search: sponsor_name:(NOVO OR PFIZER OR NOVARTIS)
Count: sponsor_name.exact
Limit: 0
```
**Result**: Company submission counts for competitive benchmarking

## 2. Recent Submissions Timeline

### Count-Based Timeline (Ultra-Compact)
```
curl "https://api.fda.gov/drug/drugsfda.json?search=sponsor_name:NOVO&count=submissions.submission_status_date&limit=0"
```
**Returns**:
```json
[
  {"time": "20241209", "count": 2},
  {"time": "20241101", "count": 1},
  {"time": "20240815", "count": 1}
]
```

### Recent Applications Only
```
Method: lookup_drug
Search: sponsor_name:NOVO
Search Type: general
Sort: submissions.submission_status_date:desc
Limit: 2
```

## 3. Submission Type Analysis

### Activity Type Breakdown
```
Method: lookup_drug
Search: sponsor_name:NOVO
Count: submissions.submission_type.exact
Limit: 0
```

### Priority Submission Analysis
```
Method: lookup_drug
Search: sponsor_name:NOVO AND submissions.review_priority:PRIORITY
Search Type: general
Limit: 3
```

## 4. Advanced Query Patterns

### Date Range Filtering (2024 Activity)
```
Search: sponsor_name:NOVO AND submissions.submission_status_date:[2024-01-01 TO 2024-12-31]
```

### Exact Match Sponsor Search
```
Search: sponsor_name.exact:"NOVO NORDISK INC"
```

### Multiple Field Search
```
Search: sponsor_name:NOVO AND submissions.submission_class_code:EFFICACY
```

### Wildcard Search
```
Search: sponsor_name:NOVO*
```

## 5. Token Optimization Strategies

### Strategy 1: Count-First Approach
1. Use count queries to get overview (minimal tokens)
2. Follow up with targeted limit=1 queries for details

### Strategy 2: Pagination
```
Search: sponsor_name:NOVO
Limit: 1
Skip: 0  # Then skip: 1, skip: 2, etc.
```

### Strategy 3: Field-Specific Search
```
Search: application_number:NDA213051
Limit: 1
```

## 6. Real-World Examples

### Novo Nordisk Recent Activity (90% Token Reduction)
```
# Instead of: limit=10 (~130KB)
# Use: count query + limit=1 follow-up (~500 chars + 13KB)

# Step 1: Get timeline
curl "https://api.fda.gov/drug/drugsfda.json?search=sponsor_name:NOVO&count=submissions.submission_status_date&limit=0"

# Step 2: Get latest details
curl "https://api.fda.gov/drug/drugsfda.json?search=sponsor_name:NOVO&limit=1"
```

### Competitive Intelligence Dashboard
```
# Company activity comparison
search=sponsor_name:(NOVO OR PFIZER OR ROCHE)&count=sponsor_name.exact&limit=0

# Recent submission types
search=submissions.submission_status_date:[2024-01-01 TO 2024-12-31]&count=submissions.submission_type.exact&limit=0

# Priority applications
search=submissions.review_priority:PRIORITY&count=sponsor_name.exact&limit=0
```

## 7. MCP Server Integration

### Optimized Query Parameters
```javascript
{
  method: "lookup_drug",
  search_type: "general",
  search_term: "sponsor_name:NOVO",
  count: "submissions.submission_status_date",
  limit: 0
}
```

### Hybrid Approach
```javascript
// Step 1: Overview
{
  method: "lookup_drug",
  search_term: "sponsor_name:NOVO",
  count: "submissions.submission_status_date",
  limit: 0
}

// Step 2: Details
{
  method: "lookup_drug",
  search_term: "sponsor_name:NOVO",
  search_type: "general",
  limit: 1
}
```

## 8. Performance Metrics

| Query Type | Response Size | Use Case |
|------------|---------------|----------|
| Count-only | ~500 chars | Timeline overview |
| Limit=1 | ~13KB | Detailed analysis |
| Limit=2 | ~26KB | Comparative analysis |
| Limit=10 | ~130KB | Comprehensive review |

## 9. Best Practices

1. **Start with count queries** for overview intelligence
2. **Use limit=1-2** for detailed follow-up
3. **Leverage exact matching** for precise sponsor names
4. **Combine multiple small queries** instead of one large query
5. **Use date ranges** to filter recent activity
6. **Cache count results** for dashboard applications

## 10. Error Handling

Common issues and solutions:
- `Nothing to count`: Field doesn't support counting
- `No matches found`: Check exact sponsor name spelling
- `Invalid field`: Use supported field names
- Large responses: Reduce limit or use count queries

This guide enables 80-90% token reduction while maintaining comprehensive pharmaceutical regulatory intelligence capabilities.