# Stage 1 Frontend API Integration

## Overview

This document tracks the Stage 1 frontend integration for the trading dashboard. At this stage the UI consumes the backend mock endpoints in read-only mode so we can validate schema alignment while write flows remain disabled.

## What Was Changed

### 1. API Client Layer (`src/lib/api/`)

- **`client.ts`** – HTTP client with retry logic and consistent error handling
- **`endpoints.ts`** – Read-only bindings for indicator datasets, walk-forward runs, and trade simulation runs
- **`index.ts`** – Barrel export used throughout the app

### 2. TypeScript Types (`src/lib/types/api.ts`)

Type definitions mirror the backend DTOs:
- `IndicatorDataset`
- `WalkforwardRun`, `WalkforwardFold`, `WalkforwardRunDetail`
- `TradeSimulationRun`, `SimulationBucket`, `TradeSimulationDetail`
- Generic `ApiResponse` / `ApiError`

### 3. React Query Hooks (`src/lib/hooks/useApi.ts`)

- `useDatasets()`
- `useWalkforwardRuns()` / `useWalkforwardRunDetail()`
- `useTradeSimulationRuns()` / `useTradeSimulationDetail()`

Hooks are intentionally read-only until backend write APIs land.

### 4. Updated Components

#### Walkforward Dashboard (`src/apps/walkforward/index.tsx`)
- Read-only metadata view with JSON panels for hyperparameters, config, and summary metrics
- Fold table generated from backend payload
- Creation/deletion buttons removed pending backend support

#### Trade Simulation Dashboard (`src/apps/tradesim/index.tsx`)
- Displays simulation metadata and aggregated trade buckets
- Per-trade tables and execution controls deferred to later stages

#### LFS Dashboard (`src/apps/lfs/index.tsx`)
- Dataset selector backed by the indicator endpoint
- Feature/target pickers fall back to static lists until dedicated APIs exist
- "Save configuration" stores selections locally with an informational message

### 5. Environment Configuration

Created environment templates (`.env.example`, `.env.local.example`, `.env.production.example`).
Defaults point to the Stage 1 mock server at `http://45.85.147.236:33931`.

### 6. Verification & QA

Created automated testing and documentation:
- **`scripts/verifyStage1.ts`**: Node script that validates all API endpoints
- **`docs/qa/frontend_stage1.md`**: Comprehensive QA manual with test flows
- Run verification: `npm run verify-stage1`

## API Endpoints Used

### Datasets
- `GET /api/indicators/datasets`
- `GET /api/indicators/datasets/{id}`

### Walkforward
- `GET /api/walkforward/runs`
- `GET /api/walkforward/runs/{id}` → `{ run, folds }`

### Trade Simulation
- `GET /api/tradesim/runs`
- `GET /api/tradesim/runs/{id}` → `{ run, buckets }`

No POST/DELETE endpoints are exposed in Stage 1.

## Configuration

### Environment Variables

Set `VITE_API_BASE_URL` to point to your backend server:

```bash
# Development (mock server)
VITE_API_BASE_URL=http://localhost:33931

# Remote mock server
VITE_API_BASE_URL=http://45.85.147.236:33931
```

### React Query Settings

Configured in `src/App.tsx`:
- **Stale time**: 5 minutes
- **Cache time**: 10 minutes
- **Retry**: 1 attempt
- **Refetch on window focus**: Disabled

## Error Handling

### Network & Data Handling
- Requests surface toast-friendly errors and fall back to descriptive empty states.
- Skeletons indicate loading states while data is fetched.
- TypeScript typings and runtime guards ensure unexpected payloads are surfaced quickly.

## Testing

### Automated Tests
```bash
npm run verify-stage1
```

The script checks reachability of the read-only endpoints and validates basic response structure.

### Manual Testing
Updated walkthroughs live in `docs/qa/frontend_stage1.md`.

## Performance

### Caching Strategy
- React Query caches responses for five minutes and avoids refetch on window focus.

## Known Limitations

1. **Read-only experience** – creation/deletion APIs are not yet available.
2. **No real-time updates** – dashboards refresh on user action only.
3. **No pagination** – large payloads could impact rendering until backend adds slicing.
4. **Backend dependency** – requires the mock Drogon service to be reachable on port 33931.

## Future Enhancements

- [ ] Enable write APIs (run creation, deletion, LFS execution)
- [ ] Add WebSocket updates once backend streams are available
- [ ] Introduce pagination/filters for large historical datasets
- [ ] Re-enable trade-level drill-down when backend exposes per-trade records
- [ ] Add offline caching once the architecture stabilises

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
