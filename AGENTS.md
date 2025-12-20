# Repository Guidelines

## Project Structure & Module Organization
The Vite + React + TypeScript app lives under `src/`. Routed screens are grouped in `src/components` (shared primitives in `components/ui`), with fallback pages in `src/pages`. Reusable data hooks and cache helpers live in `src/hooks` and `src/utils`, while domain contracts stay in `src/types`. Static assets sit in `public/` beside `index.html`. Tailwind, ESLint, and Vite configs remain at the project root—extend them there instead of adding per-module overrides.

## Build, Test, and Development Commands
Run `npm install` after cloning to sync dependencies. `npm run dev` starts the Vite dev server at http://localhost:5173 (the router mounts under `/trade`). `npm run build` emits the production bundle; `npm run build:dev` recreates a development-mode build for quick parity checks. Use `npm run preview` to smoke-test the production output. Always lint before pushing with `npm run lint` to pick up TypeScript and Tailwind issues early.

## Coding Style & Naming Conventions
Follow the established functional React layout with `use*` hooks wrapping server concerns. Components and JSX modules stay in PascalCase (`PositionsTable.tsx`); non-visual helpers use camelCase filenames (`cache.ts`). Keep indentation at two spaces and prefer double quotes in JSX/TS to match the lint config. Use the `@/` path alias (see `tsconfig.json`) for local imports, and compose Tailwind classes with the `cn` helper from `src/lib/utils.ts`.

## Testing Guidelines
Automated tests are not yet wired in; when adding them, install Vitest + React Testing Library and colocate specs as `ComponentName.test.tsx`. Mock the `/traders/<id>/ws/account` and `/traders/<id>/ws/status` sockets so reconnection behaviour in `useAccountState` and `useStatusStream` is verified deterministically. Until the suite exists, capture manual QA steps in PRs (for example, confirming live tables after `npm run dev`).

## Commit & Pull Request Guidelines
Use Conventional Commit-style subjects (`feat:`, `fix:`, `chore:`) written in imperative voice (e.g. `feat: surface order history cache`). PRs should include a succinct summary, links to relevant specs (`account_state_api.md`, etc.), screenshots or screencasts for UI shifts, and explicit smoke-test notes. Request early review for WebSocket or routing changes to keep the `/trade` subpath stable.

## Security & Configuration Notes
WebSocket endpoints are reverse-proxied through `/traders/<id>/ws/account` and `/traders/<id>/ws/status`; never hardcode backend ports in components. Cache keys are defined in `src/utils/cache.ts`—use `clearAllCache()` when debugging, but avoid logging payloads that expose balances or orders. Keep environment tweaks in Vite env files instead of editing committed config.
