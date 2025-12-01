# Kraken Live Model Frontend Update

## What changed
- Added Kraken REST client (`src/lib/kraken/client.ts`) with Go Live + active model endpoints and React Query hooks (`useGoLive`, `useActiveModel`).
- Extended config with `VITE_KRAKEN_REST_BASE_URL` for REST calls (defaults to `window.location.origin`).
- Walkforward UI updates:
  - New “Go Live” button in the Simulation header (enabled when a run is loaded) that opens a modal to paste the indicator script and trigger Go Live against the GPU node.
  - `GoLiveModal` shows the selected run id/dataset/target/features and blocks submission until a script is provided.
  - `ActiveModelCard` surfaces the active live model (id, feature hash, thresholds, trained time) via `/api/live/active_model`.
- Go Live flow uses the currently active loaded run (`run_id`) and posts `{run_id, indicator_script}` to `/api/live/go`; toasts on success/failure and auto-refreshes the active model query.

## How it works now
1) Load a saved run (unchanged). This enables the “Go Live” button.
2) Click “Go Live”, paste the indicator script that matches the run’s features, and submit. The frontend calls Kraken `POST /api/live/go`.
3) Active model status is displayed in the “Active Live Model” card once the backend returns data from `/api/live/active_model`.

## Remaining gaps / follow-ups
- Backend must expose `/api/live/active_model` (placeholder query in UI) and should return `model_id`, `feature_hash`, `long_threshold`, `short_threshold`, `trained_at_ms`.
- Backend still requires an explicit `indicator_script`; when the GPU node can fetch it from the run, extend the modal to make the script optional.
- Live training via `live=true` on the XGBoost websocket is not hooked in the UI; once available, add a toggle and surface live metrics/ROC.
- Add error handling for the case where the backend rejects a script because features are missing (surface the backend error message in the toast/modal).

## Env to set
- `VITE_KRAKEN_REST_BASE_URL` (e.g., `https://<kraken-host>`). Falls back to `window.location.origin` if not set.
