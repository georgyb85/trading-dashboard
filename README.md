# Trading Control Panel

Unified React + Vite application for the Agentic Research trading dashboards.  
Routes are served from `/trade` and cover the live trading view, simulations, walkforward analysis, and feature selection tools.

## Getting Started

```bash
npm install
npm run dev         # starts Vite on http://localhost:5173/trade
npm run build       # creates production-ready assets in dist/
npm run preview     # serves the production build locally
```

The dev server assumes a reverse proxy that rewrites `/trade` to the Vite origin.  
When running locally you can omit the base path by navigating to `http://localhost:5173`.

## Project Structure

- `src/` – application code (components, hooks, pages, and app-specific modules).
- `src/apps/` – feature-specific workspaces (`tradesim`, `lfs`, `walkforward`) now hosted in the unified shell.
- `public/` – static assets copied verbatim into the build output.

## Environment

The app expects browser access to:

- Trading and status WebSocket feeds (configured in the hooks under `src/hooks/` and `src/lib/`).
- REST endpoints for account state and analytics (see `src/hooks/useAccountState.ts` and friends).

Update `.env` or inline configuration in the hooks to point to your infrastructure.

### Key Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_STAGE1_API_BASE_URL` | `https://agenticresearch.info` | Stage1 Drogon REST base URL |
| `VITE_STAGE1_API_TOKEN` | _(empty)_ | Optional auth token forwarded as `X-Stage1-Token` |
| `VITE_KRAKEN_XGBOOST_WS_URL` | `ws://220.82.52.202:51187/xgboost` | Kraken GPU WebSocket endpoint used by the Test Model tab |

## Deployment

`npm run build` outputs `/dist` containing `index.html` and hashed static assets.  
Serve that directory behind your preferred web server (e.g., Nginx) with the base path `/trade`.
