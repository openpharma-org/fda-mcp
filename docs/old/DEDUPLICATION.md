# Request Deduplication

The FDA MCP Server implements intelligent request deduplication to prevent multiple identical API calls from being executed simultaneously. This significantly improves performance and reduces load on the FDA API.

## How It Works

When multiple identical requests are made concurrently, the system:

1. **Generates a unique key** based on request parameters (method, search term, filters, etc.)
2. **Checks for ongoing requests** with the same key
3. **Returns the existing promise** if a matching request is already in progress
4. **Tracks statistics** about deduplication effectiveness

## Benefits

- **Reduced API Load**: Eliminates redundant calls to FDA API
- **Improved Performance**: Faster response times for duplicate requests
- **Cost Savings**: Lower API usage and bandwidth consumption
- **Better User Experience**: Consistent response times even under load

## Configuration

Deduplication is enabled by default but can be configured:

```typescript
const client = new FdaApiClient({
  deduplicationEnabled: true  // Default: true
});
```

Or via configuration:

```javascript
// src/config/defaults.ts
performance: {
  requestDeduplicationEnabled: true
}
```

## Request Key Generation

The deduplication key is generated from:

- `method` (lookup_drug, lookup_device)
- `search_term`
- `search_type` (general, label, adverse_events, etc.)
- `limit`
- `count`
- `field_exists`
- `pharm_class`

Parameters are sorted and serialized to ensure consistent keys.

## Statistics

Monitor deduplication effectiveness:

```typescript
const stats = client.getRequestStats();
console.log(stats);
// {
//   totalRequests: 100,
//   deduplicatedRequests: 25,
//   deduplicationRate: 25.0
// }
```

## Monitoring

Track ongoing requests:

```typescript
const status = client.getOngoingRequestsStatus();
console.log(status);
// {
//   count: 3,
//   keys: ["method:lookup_drug,search_term:aspirin...", ...]
// }
```

## Implementation Notes

- **Thread-safe**: Uses JavaScript's single-threaded nature and Promise sharing
- **Memory efficient**: Automatically cleans up completed requests
- **Error handling**: Failed requests don't affect other identical requests
- **Configurable**: Can be disabled if needed for specific use cases

## Testing

Test deduplication with:

```bash
npm run build
node test-deduplication.js
```

This fires 3 identical requests simultaneously and shows deduplication statistics.

## Performance Impact

- **Memory overhead**: ~100-200 bytes per ongoing request
- **CPU overhead**: Minimal (key generation and Map operations)
- **Network savings**: Significant reduction in redundant API calls
- **Response time**: Improved for duplicate requests (shared Promise resolution)