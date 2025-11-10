# Backend API Tasks: Fix Incomplete Fold Data in `/api/runs/{id}` Endpoint

## Issue Summary

- **Endpoint:** `GET /api/runs/{id}`
- **Current behavior:** Returns only 162 folds when `summary_metrics.folds = 312`
- **Expected behavior:** Return ALL folds for the run, or provide pagination
- **Impact:** Frontend displays incomplete data, incorrect metrics, and missing folds

## Investigation Results

**From frontend logs:**
```
[handleLoadRun] Total folds in array: 162
[handleLoadRun] Summary metrics folds: 312
[handleLoadRun] Last fold in array: {fold_number: 161, ...}
```

**Confirmation:**
- API returns folds 0-161 (162 total)
- Summary metadata says 312 folds exist
- 150 folds are missing from the response

---

## Task 1: Investigate Fold Limit in WalkforwardRuns Query
**Priority: HIGH**

### Description
Check the SQL query in `WalkforwardRuns::toJson()` or wherever folds are fetched. There's likely a hardcoded `LIMIT 162` or similar constraint.

### Files to Check
- `models/WalkforwardRuns.cc` (or equivalent model file)
- Any fold-related join queries
- Database ORM/query builder code
- Look for `LIMIT`, `TOP`, or row limiting clauses

### Action Required
Remove or increase the limit to support all folds (at least 500+)

### Acceptance Criteria
- [ ] All folds for a run are returned in the API response
- [ ] `folds.length` matches `summary_metrics.folds`
- [ ] Tested with runs containing 300+ folds

---

## Task 2: Add Pagination Parameters (Optional but Recommended)
**Priority: MEDIUM**

### Description
If returning 312+ fold objects causes performance issues, add pagination support to the endpoint.

### Implementation

**Add query parameters:**
```
GET /api/runs/{id}?fold_limit=500&fold_offset=0
```

**Default values:**
- `fold_limit`: 500 (or unlimited if reasonable)
- `fold_offset`: 0

**Response format:**
```json
{
  "run_id": "uuid",
  "dataset_id": "uuid",
  "feature_columns": ["feat1", "feat2"],
  "hyperparameters": {...},
  "walk_config": {...},
  "summary_metrics": {"folds": 312, ...},
  "folds": [...],
  "fold_count": 162,
  "total_folds": 312,
  "fold_offset": 0,
  "has_more_folds": true
}
```

### Benefits
- Prevents huge responses for runs with 1000+ folds
- Allows frontend to fetch folds in batches if needed
- Better API performance and memory usage
- Backward compatible (defaults work for existing clients)

### Acceptance Criteria
- [ ] `fold_limit` parameter controls max folds returned
- [ ] `fold_offset` parameter allows pagination
- [ ] Response includes pagination metadata
- [ ] Default behavior returns at least 500 folds
- [ ] Tested with various limit/offset combinations

---

## Task 3: Ensure Consistent Data Between Summary and Details
**Priority: HIGH**

### Description
Verify that `summary_metrics.folds` matches the actual number of fold records available.

### Check Points

1. **When setting `summary_metrics.folds`:**
   - Ensure it reflects the ACTUAL fold count in the database
   - Count should be `SELECT COUNT(*) FROM fold_results WHERE run_id = ?`

2. **If limiting folds in response:**
   - Add fields to indicate this is a partial response
   - Include total count vs returned count

3. **Data integrity:**
   - Verify fold_number sequence is continuous (0, 1, 2, ... N)
   - No missing fold numbers in database

### Recommended Response Structure

```json
{
  "run_id": "c942f1fc-5d4f-4301-9b20-346cb264f1a8",
  "folds": [...],
  "fold_count": 162,        // Items in THIS response
  "total_folds": 312,       // Total available in DB
  "fold_offset": 0,         // Starting offset
  "has_more_folds": true    // More data available
}
```

### Acceptance Criteria
- [ ] `summary_metrics.folds` matches database count
- [ ] No phantom folds (metadata says exists but not in DB)
- [ ] Response clearly indicates if data is partial

---

## Task 4: Test with Multiple Run Sizes
**Priority: MEDIUM**

### Test Cases

| Test Case | Fold Count | Expected Behavior |
|-----------|-----------|-------------------|
| Small run | < 50 folds | All folds returned in single response |
| Medium run | 150-200 folds | All folds returned (or paginated correctly) |
| Large run | 300-500 folds | All folds returned (or paginated correctly) |
| Very large run | 1000+ folds | Pagination works correctly |

### Verification Steps

1. Create test runs with various fold counts
2. Fetch via `GET /api/runs/{id}`
3. Verify:
   - `folds.length` matches expected count
   - All fold numbers present (0 to N-1)
   - No duplicates
   - Metrics are complete and accurate

### Performance Testing
- [ ] Response time < 2 seconds for 500 folds
- [ ] Response size reasonable (< 5MB for 500 folds)
- [ ] Memory usage acceptable on backend

---

## Task 5: Update API Documentation
**Priority: LOW**

### Current Documentation

```markdown
### GET /api/runs/{id}
Get a specific run by ID.

**Response:** Single run object (matches Stage1MetadataReader expectations).
```

### Updated Documentation

```markdown
### GET /api/runs/{id}
Get a specific run by ID with all fold details.

**Query Parameters:**
- `fold_limit` (optional, default: 500): Maximum folds to return
- `fold_offset` (optional, default: 0): Fold offset for pagination

**Response:**
```json
{
  "run_id": "uuid",
  "dataset_id": "uuid",
  "feature_columns": ["feat1", "feat2"],
  "hyperparameters": {...},
  "walk_config": {...},
  "summary_metrics": {"folds": 312, ...},
  "folds": [
    {
      "fold_number": 0,
      "train_start_idx": 0,
      "train_end_idx": 650,
      "test_start_idx": 654,
      "test_end_idx": 678,
      "samples_train": 650,
      "samples_test": 24,
      "best_iteration": 100,
      "best_score": 0.000911,
      "metrics": {
        "hit_rate": 0.5,
        "n_signals": 6,
        "running_sum": -477.46,
        "profit_factor_test": 0.132,
        ...
      },
      "thresholds": {
        "prediction_scaled": 0.798373,
        ...
      }
    }
  ],
  "fold_count": 162,      // Folds in this response
  "total_folds": 312,     // Total folds available
  "fold_offset": 0,       // Starting offset
  "has_more_folds": true  // More data available
}
```

**Pagination Example:**

To fetch all folds for a run with 312 folds:
```bash
# First batch
curl https://agenticresearch.info/api/runs/{id}?fold_limit=200&fold_offset=0

# Second batch
curl https://agenticresearch.info/api/runs/{id}?fold_limit=200&fold_offset=200
```

**Note:** If `total_folds > fold_count`, make additional requests with
`fold_offset` to retrieve remaining folds.
```

### File to Update
- `STAGE1_API_DOCUMENTATION.md`

---

## Expected Backend Changes Summary

### Minimal Fix (No Pagination)
1. Remove fold limit (162) from query
2. Return all folds in single response
3. Verify `summary_metrics.folds` matches actual count
4. Test with 300+ fold runs

### Recommended Fix (With Pagination)
1. Add `fold_limit` and `fold_offset` query parameters
2. Return pagination metadata (`fold_count`, `total_folds`, `has_more_folds`)
3. Default `fold_limit=500` (or unlimited if performance allows)
4. Update documentation
5. Maintain backward compatibility

---

## Frontend Impact

Once backend is fixed, frontend will:
- Display all folds in "Fold-by-Fold Performance" table
- Show correct fold count in "Performance Summary"
- Calculate correct aggregate metrics (total signals, hit rates, etc.)
- Plot complete performance chart with all fold data points

**Frontend changes needed:**
- If pagination implemented: Add logic to fetch all pages
- Update LoadRunModal to show accurate fold count
- No changes needed if backend returns all folds in single response

---

## Testing Checklist

- [ ] Fold limit removed or increased to 500+
- [ ] All folds returned for test run (312 folds)
- [ ] `summary_metrics.folds` matches `folds.length`
- [ ] Fold numbers are sequential (0, 1, 2, ... N-1)
- [ ] No duplicate folds in response
- [ ] All fold metrics parsed correctly (not JSON strings)
- [ ] Response time acceptable (< 2s for 500 folds)
- [ ] Documentation updated
- [ ] Frontend verified with complete data

---

## Contact

If questions arise during implementation:
- Check frontend logs for actual API response structure
- Review `models/WalkforwardRuns.cc` and recent commit c61a7bd (JSONB parsing fix)
- Test with run ID: `c942f1fc-5d4f-4301-9b20-346cb264f1a8` (known 312-fold run)

---

**Last Updated:** 2025-11-10
**Reported By:** Frontend Developer
**Assigned To:** Backend API Team
