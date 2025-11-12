# Backend Fold Limit Issue

## Problem Summary

The Stage1 API endpoint `/api/runs/{id}` is returning incomplete fold arrays for runs with large fold counts. When a run has 312 folds, the API only returns 196 fold objects in the response, causing discrepancies in performance calculations and visualizations.

## Evidence

Console logs from loading test4 dataset run (created 2025-11-11):

```
[handleLoadRun] Total folds in array: 196
[handleLoadRun] Summary metrics folds: 312
[handleLoadRun] Last fold in array: fold_number: 311
```

**Key Observations:**
- `summary_metrics.folds` correctly reports: **312 folds**
- Actual `folds[]` array length: **196 objects**
- Last fold object has `fold_number: 311` (not 195)

## Technical Details

### What's Happening

The backend appears to be **sampling/skipping folds** to limit response payload size:
- Total folds: 312
- Returned folds: 196
- Sampling rate: ~63% (approximately every other fold)
- The fold objects that ARE returned maintain their original `fold_number` fields

### Response Structure

```json
{
  "run_id": "f9d8450e-edd5-4377-8bb5-7d1ac669ba00",
  "dataset_id": "e32dfd4d-4879-451f-9d2b-e8ab9da6d226",
  "summary_metrics": {
    "folds": 312,  // ✓ Correct
    // ... other summary stats
  },
  "folds": [
    // Only 196 fold objects instead of 312
    { "fold_number": 0, "metrics": {...}, ... },
    { "fold_number": 1, "metrics": {...}, ... },
    { "fold_number": 3, "metrics": {...}, ... },  // Note: skipped fold 2
    { "fold_number": 5, "metrics": {...}, ... },  // Note: skipped fold 4
    // ...
    { "fold_number": 311, "metrics": {...}, ... }
  ]
}
```

## Impact on Frontend

### What Works
- **Fold-by-fold performance table**: Displays all 196 received fold objects with their original fold numbers (0, 1, 3, 5, ..., 311)
- User sees rows numbered 0-311 but doesn't realize ~116 folds are missing

### What's Broken
- **Performance Summary Table**: Calculates metrics based on 196 folds instead of 312
  - Hit rates are incorrect (weighted by wrong sample size)
  - Profit factors are incomplete (missing ~116 folds worth of P&L)
  - Signal counts are understated

- **Cumulative Profit Chart**: Only plots 196 data points instead of 312
  - Chart ends prematurely
  - Missing ~37% of the run's progression
  - Final cumulative P&L may be correct (if last fold is included) but the curve is distorted

### Specific Calculation Errors

From `FoldPerformance_ReconstructionGuide.md`, aggregate metrics require **ALL folds**:

```typescript
// These calculations are WRONG when folds are missing:
total_long_signals  = Σ fold.n_signals           // Missing ~116 folds
total_short_signals = Σ fold.n_short_signals     // Missing ~116 folds
hit_rate_long = Σ (fold.hit_rate * fold.n_signals) / total_long_signals  // Wrong weights
pf_long = (Σ fold.sum_wins) / (Σ fold.sum_losses)  // Missing P&L data
```

## Root Cause Analysis

### Likely Implementation

The backend is probably doing something like:

**Option 1: Limit by array slice**
```python
# In /api/runs/{id} endpoint
MAX_FOLDS = 200
if len(folds) > MAX_FOLDS:
    # Return subset to limit response size
    folds = folds[:MAX_FOLDS]
```

**Option 2: Sampling every Nth fold**
```python
# Sample to reduce payload
if len(folds) > 200:
    step = len(folds) // 200
    folds = folds[::step]  # Every Nth fold
```

The console logs suggest **Option 2** (sampling) since the last fold has `fold_number: 311`.

### Why This Approach Is Problematic

1. **Data Integrity**: Frontend calculations require complete fold sequences
2. **Misleading**: User sees fold #311 and assumes all 312 folds are present
3. **No Warning**: No indication in the response that data is incomplete
4. **Inconsistent**: `summary_metrics.folds: 312` contradicts `folds.length: 196`

## Recommended Solutions

### Solution 1: Pagination (Preferred)

Add pagination support to the endpoint:

```
GET /api/runs/{id}?page=1&page_size=100&include_folds=true
GET /api/runs/{id}?page=2&page_size=100&include_folds=true
```

**Advantages:**
- Complete data available
- Manageable response sizes
- Standard REST pattern
- Backwards compatible (default to page 1)

**Frontend Changes Required:**
- Implement paginated fetching in `useStage1RunDetail` hook
- Load all pages sequentially or in parallel
- Show loading progress for large runs

### Solution 2: Separate Folds Endpoint

```
GET /api/runs/{id}           # Run metadata + summary_metrics only
GET /api/runs/{id}/folds     # All folds (paginated or compressed)
```

**Advantages:**
- Clean separation of concerns
- Run metadata loads fast
- Folds fetched on-demand
- Can use compression for fold data

### Solution 3: Query Parameter for Full Data

```
GET /api/runs/{id}?full=true              # Returns all folds
GET /api/runs/{id}?folds=none             # Summary only
GET /api/runs/{id}?folds=sampled          # Current behavior (default)
```

**Advantages:**
- Backwards compatible
- Explicit control
- Simple implementation

**Disadvantages:**
- Large response sizes possible
- May timeout for runs with 1000+ folds

### Solution 4: Response Compression

Keep current structure but enable gzip/brotli compression:

```python
# Backend
response.headers['Content-Encoding'] = 'gzip'
return gzip.compress(json.dumps(data))
```

**Advantages:**
- JSON compresses well (~70-80% reduction)
- 312 folds might fit in reasonable payload
- Transparent to client

**Disadvantages:**
- Still limited for very large runs
- Doesn't solve the fundamental scalability issue

## Recommended Immediate Fix

**Implement Solution 1 (Pagination) + Solution 4 (Compression)**

1. Add pagination parameters to `/api/runs/{id}`
2. Enable response compression
3. Update frontend to fetch all pages
4. Add loading indicator: "Loading folds 1-100, 101-200, 201-312..."

## Alternative: Frontend Workaround (Not Recommended)

If backend changes are delayed, frontend could:
- Detect when `folds.length < summary_metrics.folds`
- Show warning banner: "⚠️ Only 196 of 312 folds loaded. Metrics are incomplete."
- Disable Performance Summary and Chart when data is incomplete
- Force user to load smaller runs or wait for backend fix

**This is NOT recommended because:**
- Defeats the purpose of having the data
- Poor user experience
- Doesn't solve the underlying problem

## Testing Checklist

Once backend is fixed, verify:

- [ ] Run with 312 folds returns all 312 fold objects
- [ ] `folds.length === summary_metrics.folds`
- [ ] Performance Summary metrics match desktop calculations
- [ ] Cumulative Profit chart has 312 data points
- [ ] Fold-by-fold table has 312 consecutive rows (0-311)
- [ ] Response time remains acceptable (<5 seconds)
- [ ] Memory usage is reasonable
- [ ] Works with runs having 1000+ folds

## Related Files

- Frontend fold calculation logic: `src/apps/walkforward/index.tsx:248-363`
- Debug logging added: `src/apps/walkforward/index.tsx:158-160, 254-256, 294-296`
- Stage1 API client: `src/lib/stage1/client.ts`
- Run detail hook: `src/lib/stage1/hooks.ts`
- Fold metrics guide: `FoldPerformance_ReconstructionGuide.md`

## Date Identified

- **First Reported**: Multiple instances throughout development
- **Confirmed with Debug Logs**: 2025-11-11
- **Test Dataset**: test4 (dataset_id: e32dfd4d-4879-451f-9d2b-e8ab9da6d226)
- **Test Run**: run_id: f9d8450e-edd5-4377-8bb5-7d1ac669ba00
- **Expected Folds**: 312
- **Actual Folds Returned**: 196
- **Missing Data**: ~37% of folds

## Status

**OPEN** - Requires backend API changes

## Contact

Frontend implementation is correct and ready to handle complete fold data once backend fix is deployed.
