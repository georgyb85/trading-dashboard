# Frontend Stage 1 QA Documentation

## Overview

This document describes the testing procedures and expected behaviors for the Stage 1 frontend API integration.

## Prerequisites

- Backend server running at `45.85.147.236:8080` (or configured API_BASE_URL)
- QuestDB and Postgres databases populated with test data
- Frontend development server running (`npm run dev`)

## Automated Testing

### API Verification Script

Run the automated endpoint verification script:

```bash
npm run verify-stage1
```

This script tests:
- Dataset endpoints
- Walkforward run endpoints
- Trade simulation endpoints
- LFS (Local Feature Selection) endpoints

Expected output: All endpoints should return `PASS` status.

## Manual QA Test Flows

### 1. Walkforward Dashboard Testing

**Location**: `/trade/walkforward`

The Stage 1 dashboard is read-only and mirrors the backend mock payloads.

#### Test Flow 1: Load Runs

1. Navigate to the Walkforward dashboard.
2. **Expected**: Run selector populates with run IDs (or displays "No runs available").
3. **Expected**: Metadata section lists dataset, target, status, and timestamps.
4. **Expected**: Hyperparameters, walk config, and summary metrics render as JSON blocks.
5. **Expected**: Fold table lists fold numbers with train/test ranges when folds exist.

#### Test Flow 2: Switch Runs

1. Choose a different run from the dropdown.
2. **Expected**: Metadata/JSON blocks update to match the selected run.
3. **Expected**: Fold table refreshes accordingly.

> Note: Run creation/deletion is intentionally disabled in Stage 1 and should display informational messaging.

### 2. Trade Simulation Dashboard Testing

**Location**: `/trade/tradesim`

#### Test Flow 1: Load Simulation Summary

1. Navigate to the Trading Simulation dashboard.
2. **Expected**: Simulation selector lists available runs (or displays the empty state message).
3. **Expected**: Metadata block shows IDs, mode, questdb namespace, status badge, and dataset linkage.

#### Test Flow 2: Review Configuration & Metrics

1. Scroll to the configuration/summary JSON blocks.
2. **Expected**: Objects render with pretty-printed JSON; empty objects display "—".

#### Test Flow 3: Inspect Buckets

1. Verify the bucket table lists side-specific aggregates (trade count, wins, PF, etc.).
2. **Expected**: When no buckets are available, the dashboard shows an explanatory message.

> Note: Trade-level tables and simulation execution controls are deferred to later stages; buttons should be disabled or absent.

### 3. LFS (Local Feature Selection) Dashboard Testing

**Location**: `/trade/lfs`

Stage 1 renders a preview experience without backend execution.

- Datasets list originates from the indicator catalog endpoint; features/targets fall back to static options.
- Saving a configuration should produce a placeholder result summarising the staged selection.
- Confirm the informational banner explains that LFS endpoints are pending.

### 4. Data Validation Testing

#### Test: Missing Backend Fields

1. Check browser Network tab while using each app
2. **Expected**: API responses match TypeScript type definitions
3. If fields are missing:
   - **Expected**: App handles gracefully (uses default values)
   - **Expected**: Console warnings logged for debugging
   - **Expected**: UI shows "N/A" or default values, not undefined

#### Test: API Errors

1. Simulate API errors (403, 404, 500) if possible
2. **Expected**: Error states display user-friendly messages
3. **Expected**: Retry logic activates for 5xx errors
4. **Expected**: Users can recover without refresh

## Performance Expectations

### Loading States

- Initial page load: Loading skeletons should appear
- Data fetching: Smooth transitions, no layout shifts
- Maximum wait time: 5 seconds for API responses

### Caching

- Navigate between pages and back
- **Expected**: Cached data loads instantly (within stale time of 5 minutes)
- **Expected**: Background refetch happens transparently

### Network Tab Verification

1. Open browser DevTools Network tab
2. Load each dashboard
3. **Expected**: Minimal redundant requests
4. **Expected**: Failed requests show proper status codes
5. **Expected**: Request/response sizes are reasonable (<1MB for typical data)

## Edge Cases

### Empty States

- **No runs**: Each dashboard should show helpful empty state messages
- **No data in runs**: Tables should handle empty arrays gracefully

### Large Datasets

- **Many runs (50+)**: Pagination should work if implemented
- **Many trades (1000+)**: Table should render without freezing
- **Many features (100+)**: Selector should be usable

### Concurrent Updates

- **Multiple tabs open**: Changes in one tab should reflect in others (after refetch)

## Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Known Issues / Missing Features

Document any known issues discovered during QA:

1. **Backend not implemented**: If certain endpoints are not ready, document which features are affected
2. **Mock fallback**: Some components may show mock data if API is unavailable
3. **Polling**: Real-time updates require manual refresh (no WebSocket yet)

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots/recordings
5. Browser console errors
6. Network tab showing failed requests

## Sign-off Checklist

- [ ] All automated tests pass (`npm run verify-stage1`)
- [ ] Walkforward dashboard loads and displays runs
- [ ] Trade simulation loads and filters trades correctly
- [ ] LFS dashboard populates features/targets from API
- [ ] Error states display user-friendly messages
- [ ] Loading states appear appropriately
- [ ] No console errors during normal operation
- [ ] Build succeeds (`npm run build`)
- [ ] Production build works (`npm run preview`)
