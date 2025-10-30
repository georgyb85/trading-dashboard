# Frontend Agent Task Brief (Stage 1.1–1.2)

## Context
- Host: frontend server `45.85.147.236` (serves trading-dashboard, houses QuestDB/Postgres).
- Goal: replace mock UI data with API-driven content aligned with the Stage 1 backend contracts.

## Primary Goals
1. Consume the Stage 1 mock endpoints in read-only mode so the UI matches the schema contract.
2. Replace hard-coded data across Walkforward, Trade Simulation, and LFS dashboards with API responses or clearly labelled placeholders.
3. Ship verification tooling (`npm run verify-stage1`) and refreshed QA docs for the read-only experience.

## Detailed Tasks
- **API Client Setup**
  - Expose read-only helpers for:
    - `GET /api/indicators/datasets`
    - `GET /api/walkforward/runs`, `GET /api/walkforward/runs/{id}` (returns `{ run, folds }`)
    - `GET /api/tradesim/runs`, `GET /api/tradesim/runs/{id}` (returns `{ run, buckets }`)
- **UI Integration**
  - **Walkforward Dashboard:** render metadata, JSON panels, and fold table; remove create/delete controls.
  - **Trade Simulation Dashboard:** render metadata and bucket table; acknowledge that per-trade data is unavailable in Stage 1.
  - **LFS Dashboard:** consume dataset list from API, retain static feature/target lists, and surface Stage 1 placeholder messaging.
- **State Management & Caching**
  - Use React Query/Zustand or lightweight caching to avoid redundant network calls.
  - Persist last-selected dataset/run in local storage.
- **Validation & QA**
  - Add `npm run verify-stage1` script that hits each endpoint (via node script) and prints status summaries.
  - Document manual QA steps in `docs/qa/frontend_stage1.md`.
- **Configuration**
  - Update `.env.production` / `.env.local` templates with API base URL.
  - Ensure QuestDB/Postgres credentials are not exposed in the frontend bundle (backend proxies handle auth).

## Deliverables to Attach
- API client module and updated React components.
- QA script (`scripts/verifyStage1.ts`) with README instructions.
- Documentation (`docs/qa/frontend_stage1.md`) describing test flows and expected visuals.
- Updated env templates referencing backend mock host/port.

## Verification Checklist
- `[ ]` `npm run build` succeeds with read-only dashboards enabled.
- `[ ]` Walkforward dashboard renders metadata and fold table from `/api/walkforward/runs/{id}`.
- `[ ]` Trade simulation dashboard renders metadata and bucket summary from `/api/tradesim/runs/{id}`.
- `[ ]` LFS dashboard surfaces dataset list and displays Stage 1 placeholder messaging.
- `[ ]` `npm run verify-stage1` reports PASS/WARN status for the mock endpoints.
