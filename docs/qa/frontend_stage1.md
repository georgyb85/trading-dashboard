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

#### Test Flow 1: Load Existing Runs

1. Navigate to the Walkforward Dashboard
2. **Expected**: Page loads without errors
3. **Expected**: If runs exist in the database, they should be displayed
4. **Expected**: Chart data should render showing fold performance
5. **Expected**: Summary metrics should display correctly

#### Test Flow 2: View Run Details

1. If runs are available, click on different run tabs
2. **Expected**: Switching between runs updates the chart and fold table
3. **Expected**: Fold metrics (signals, hit rates, P&L) display correctly
4. **Expected**: No console errors

#### Test Flow 3: Examine Fold

1. Click "Examine" button on any fold row
2. **Expected**: Switches to "Test Model" tab
3. **Expected**: Fold configuration panel shows correct train/test indices
4. **Expected**: Features and target are populated from run config

#### Test Flow 4: Create New Run

1. Configure parameters in the Configuration Panel:
   - Model type (xgboost, etc.)
   - Data source
   - Target variable
   - Selected features
   - Walk-forward parameters
   - Hyperparameters
2. Click "Start Simulation"
3. **Expected**: Loading indicator appears
4. **Expected**: New run is created via API
5. **Expected**: On success, new run appears in the runs list
6. **Expected**: Toast notification shows success message

#### Test Flow 5: Error Handling

1. With API server stopped, attempt to create a run
2. **Expected**: Error toast appears with clear message
3. **Expected**: UI remains functional
4. Restart API server and try again
5. **Expected**: Recovery works without page reload

### 2. Trade Simulation Dashboard Testing

**Location**: `/trade/tradesim`

#### Test Flow 1: Select Simulation

1. Navigate to Trade Simulation Dashboard
2. Use the "Select simulation run" dropdown in header
3. **Expected**: Dropdown populates with available simulations
4. **Expected**: Each simulation shows name and status

#### Test Flow 2: View Trades

1. Select a simulation from dropdown
2. Navigate to "Trade List" tab
3. **Expected**: Trade table populates with trades from API
4. **Expected**: All columns display correctly:
   - Fold, Type, Entry/Exit Time, Prices, Signals, P&L, Returns
5. **Expected**: P&L values show color coding (green for profit, red for loss)

#### Test Flow 3: Filter Trades

1. With trades loaded, use the "Trade Filter" radio buttons
2. Select "Long Only"
3. **Expected**: Only long trades are displayed
4. Select "Short Only"
5. **Expected**: Only short trades are displayed
6. Select "All"
7. **Expected**: All trades are displayed

#### Test Flow 4: Empty State

1. Select a simulation with no trades
2. **Expected**: Message displays "No trades found for this simulation"
3. **Expected**: No errors in console

#### Test Flow 5: No Selection

1. Clear simulation selection (refresh page)
2. **Expected**: Message displays "Select a simulation run to view trades"

### 3. LFS (Local Feature Selection) Dashboard Testing

**Location**: `/trade/lfs`

#### Test Flow 1: Select Dataset

1. Navigate to LFS Dashboard
2. Click on "Dataset" dropdown
3. **Expected**: Available datasets populate from API
4. Select a dataset
5. **Expected**: Features and targets load for selected dataset

#### Test Flow 2: Configure Analysis

1. With dataset selected:
   - Select multiple features from the feature list
   - Select a target variable
   - Review/adjust parameters (cases, iterations, Monte Carlo trials, etc.)
2. **Expected**: All selections are reflected in UI
3. **Expected**: "Run LFS Analysis" button is enabled

#### Test Flow 3: Run Analysis

1. Click "Run LFS Analysis"
2. **Expected**: Button shows "Running Analysis..."
3. **Expected**: Analysis run is created via API
4. **Expected**: Results panel updates when analysis completes or shows status

#### Test Flow 4: View Results

1. After analysis completes:
2. **Expected**: Results table shows feature rankings
3. **Expected**: Summary shows counts of significant/marginal/noise features
4. **Expected**: Recommendations list displays
5. **Expected**: Cautions section highlights features to review

#### Test Flow 5: Empty Dataset

1. Select a dataset with no features
2. **Expected**: Alert shows "Please select a dataset first"
3. **Expected**: Feature/target selectors are disabled

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
