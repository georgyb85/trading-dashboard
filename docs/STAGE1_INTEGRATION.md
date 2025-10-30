# Stage 1 Frontend API Integration

## Overview

This document describes the Stage 1 frontend integration completed for the trading dashboard, which replaces mock data with live API endpoints from the Drogon backend.

## What Was Changed

### 1. API Client Layer (`src/lib/api/`)

Created a robust API client with:
- **`client.ts`**: Core HTTP client with retry logic and error normalization
- **`endpoints.ts`**: Typed API endpoint definitions for all Stage 1 routes
- **`index.ts`**: Barrel export for clean imports

Features:
- Automatic retry on 5xx errors (max 3 retries)
- 1-second delay between retries
- Toast-friendly error messages
- Request timeout handling

### 2. TypeScript Types (`src/lib/types/api.ts`)

Comprehensive type definitions aligned with Postgres schema:
- Dataset, Feature, Target types
- Walkforward run and fold types
- Trade simulation types
- LFS (Local Feature Selection) analysis types
- API response wrappers (ApiResponse, PaginatedResponse)

### 3. React Query Hooks (`src/lib/hooks/useApi.ts`)

Custom hooks for all API operations:
- Dataset hooks: `useDatasets`, `useDatasetFeatures`, `useDatasetTargets`
- Walkforward hooks: `useWalkforwardRuns`, `useWalkforwardFolds`, `useCreateWalkforwardRun`
- Trade simulation hooks: `useTrades`, `useTradeSimulationRuns`
- LFS hooks: `useLfsRuns`, `useCreateLfsRun`

Features:
- Automatic caching (5-minute stale time)
- Optimistic updates
- Error handling with toast notifications
- Loading states

### 4. Updated Components

#### Walkforward Dashboard (`src/apps/walkforward/index.tsx`)
- **Before**: Used `generateMockChartData`, `generateMockSummary`, `generateMockFolds`
- **After**: Fetches runs and folds from API, displays live data
- Added loading skeletons and error states
- Integrated run creation via API

#### Trade Simulation App (`src/apps/tradesim/`)
- **Before**: `TradeTable` used hardcoded `mockTrades` array
- **After**:
  - `TradeTable` accepts `simulationId` prop and fetches trades from API
  - Main dashboard includes simulation selector dropdown
  - Trade filtering (Long/Short/All) works with API data

#### LFS Dashboard (`src/apps/lfs/index.tsx`)
- **Before**: Used hardcoded `mockFeatures` and `mockTargets`
- **After**:
  - Dataset selector populated from API
  - Features and targets load dynamically based on selected dataset
  - Analysis runs submit to backend API
  - Results display from API response

### 5. Environment Configuration

Created environment templates:
- `.env.example` - General template
- `.env.local.example` - Local development template
- `.env.production.example` - Production build template
- `.env` - Active configuration (gitignored)

Default API URL: `http://45.85.147.236:8080`

### 6. Verification & QA

Created automated testing and documentation:
- **`scripts/verifyStage1.ts`**: Node script that validates all API endpoints
- **`docs/qa/frontend_stage1.md`**: Comprehensive QA manual with test flows
- Run verification: `npm run verify-stage1`

## API Endpoints Used

### Datasets
- `GET /api/datasets` - List all datasets
- `GET /api/datasets/:id` - Get dataset details
- `GET /api/datasets/:id/features` - Get features for dataset
- `GET /api/datasets/:id/targets` - Get targets for dataset

### Walkforward
- `GET /api/walkforward/runs` - List walkforward runs
- `GET /api/walkforward/runs/:id` - Get run details
- `POST /api/walkforward/runs` - Create new run
- `GET /api/walkforward/runs/:id/folds` - Get folds for run
- `DELETE /api/walkforward/runs/:id` - Delete run

### Trade Simulation
- `GET /api/tradesim/runs` - List simulation runs
- `GET /api/tradesim/runs/:id` - Get simulation details
- `POST /api/tradesim/runs` - Create new simulation
- `GET /api/tradesim/runs/:id/trades` - Get trades (with optional filters)

### LFS (Local Feature Selection)
- `GET /api/lfs/runs` - List LFS analysis runs
- `GET /api/lfs/runs/:id` - Get analysis details
- `POST /api/lfs/runs` - Start new analysis

## Configuration

### Environment Variables

Set `VITE_API_BASE_URL` to point to your backend server:

```bash
# Development
VITE_API_BASE_URL=http://localhost:8080

# Production
VITE_API_BASE_URL=http://45.85.147.236:8080
```

### React Query Settings

Configured in `src/App.tsx`:
- **Stale time**: 5 minutes
- **Cache time**: 10 minutes
- **Retry**: 1 attempt
- **Refetch on window focus**: Disabled

## Error Handling

### Network Errors
- Automatic retry for 5xx server errors
- User-friendly toast notifications
- Graceful degradation (shows empty states)

### Missing Data
- Loading skeletons during fetch
- Empty state messages when no data
- Error alerts for failed requests

### Type Safety
- All API responses typed with TypeScript
- Runtime validation via response checks
- Default values for missing fields

## Testing

### Automated Tests
```bash
npm run verify-stage1
```

This runs the verification script that checks:
- All endpoints are reachable
- Responses have correct structure
- Required fields are present

### Manual Testing
See `docs/qa/frontend_stage1.md` for detailed test flows covering:
- Loading and viewing runs
- Creating new runs
- Filtering and selecting data
- Error scenarios
- Empty states

## Performance

### Caching Strategy
- API data cached for 5 minutes (stale time)
- Background refetch after stale time
- Manual refetch on user actions

### Network Optimization
- Parallel requests where possible
- Request deduplication via React Query
- Minimal payload sizes

### Bundle Size
- Production build: ~1.08 MB (293 KB gzipped)
- Recommendation: Consider code splitting for further optimization

## Known Limitations

1. **No real-time updates**: Data refreshes on user action or stale time expiry (no WebSocket)
2. **No pagination**: Large datasets may cause performance issues
3. **Limited offline support**: Requires network connection
4. **Backend dependency**: All features require backend endpoints to be implemented

## Future Enhancements

- [ ] Add WebSocket support for real-time updates
- [ ] Implement pagination for large datasets
- [ ] Add offline mode with service workers
- [ ] Optimize bundle size with code splitting
- [ ] Add more granular error recovery options
- [ ] Implement request cancellation for pending queries

## Migration Notes

### For Developers

If you need to add new API endpoints:

1. Add types to `src/lib/types/api.ts`
2. Add endpoint to `src/lib/api/endpoints.ts`
3. Create React Query hook in `src/lib/hooks/useApi.ts`
4. Update component to use hook
5. Add test to `scripts/verifyStage1.ts`
6. Document in `docs/qa/frontend_stage1.md`

### For Backend Developers

The frontend expects:
- JSON responses matching TypeScript types
- Standard HTTP status codes
- Error responses with `{ message: string }` format
- CORS headers allowing frontend origin

## Support

For issues or questions:
1. Check `docs/qa/frontend_stage1.md` for common issues
2. Run `npm run verify-stage1` to diagnose API problems
3. Check browser console and network tab
4. Review error messages in toast notifications
