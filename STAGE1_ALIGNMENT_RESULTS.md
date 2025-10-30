# Stage 1.1–1.2 Alignment Results

## Context Snapshot
- **Environment:** Laptop dev workspace (this repo), frontend server `45.85.147.236` (QuestDB + Postgres + web build), backend GPU node `39.114.73.97` (CUDA + Drogon services).
- **Data entry point:** ChronosFlow/TSSB loaders convert local CSVs into Arrow tables and add UTC epoch seconds via `chronosflow::AnalyticsDataFrame::with_unix_timestamp` (`analytics_dataframe.cpp:360-441`).
- **QuestDB export path:** `TimeSeriesWindow::ExportToQuestDB` (`TimeSeriesWindow.cpp:655-712`) batches Arrow rows into ILP payloads and streams them to `telnet://45.85.147.236:9009`.

## Stage 1.1 – Architecture & Dataflow Alignment

### End-to-End Historical Workflow
1. **Desktop ingest:** User loads indicator CSV in the Dear ImGui Time Series window; Arrow schema and TSSB metadata are captured (`TimeSeriesWindow.cpp:173-220`).
2. **Timestamp normalization:** `with_unix_timestamp` casts date/time columns to `int64` and uses `timegm` to produce UTC seconds, ensuring timezone-agnostic alignment (`analytics_dataframe.cpp:360-429`).
3. **Manual export:** User triggers `Export to QuestDB`, which serializes each row into ILP, skipping invalid/NaN values and writing in UTC nanoseconds (`TimeSeriesWindow.cpp:655-719`).
4. **QuestDB storage:** Remote QuestDB (frontend node) stores each dataset under a measurement selected in the UI; current code does not attach tags, so schema conventions must be enforced through table naming.
5. **Metadata capture:** When walk-forward or trade simulations run on the laptop, summaries are currently in-memory only; Stage 1 introduces Postgres persistence (see Stage 1.2).
6. **Backend/Frontend consumption:** Drogon controllers will read QuestDB/Postgres over LAN, expose JSON endpoints, and the trading-dashboard UI will replace stubbed data with live payloads.

### Identifier & Timezone Conventions
- All TSSB timestamps are interpreted as wall-clock times in **UTC** once exported (`timegm` call at `analytics_dataframe.cpp:423-428`).
- Indicator datasets must expose numeric `Date` and `Time` columns (HHMM or HHMMSS); exporter infers format and stores both raw integers and Unix seconds for back-reference.
- Recommended dataset slug: `<symbol>_<interval>_<version>` (e.g., `btc_4h_v1`) reused across QuestDB tags and Postgres metadata.

### Frontend Stub Inventory → Target Endpoints

| Area | File | Current data source | Target backend endpoint | Notes |
| --- | --- | --- | --- | --- |
| Walkforward dashboard | `trading-dashboard/src/apps/walkforward/index.tsx` | Read-only metadata + fold table | `GET /api/walkforward/runs`, `GET /api/walkforward/runs/{id}` | Creation/deletion deferred; UI displays JSON blocks and fold table. |
| Trade simulation dashboard | `trading-dashboard/src/apps/tradesim/index.tsx` | Read-only metadata + aggregated buckets | `GET /api/tradesim/runs`, `GET /api/tradesim/runs/{id}` | Trade-level detail deferred until backend exposes per-trade endpoints. |
| Local Feature Selection (LFS) | `trading-dashboard/src/apps/lfs/index.tsx` | Static feature/target lists with dataset selector | `GET /api/indicators/datasets` | LFS execution not yet exposed; UI records staged configurations only. |

### Environment Matrix

| Layer | Host | Role | Notes |
| --- | --- | --- | --- |
| Laptop (repo) | local | Data prep, manual exports, UI prototyping | Runs Dear ImGui workflow for exporting datasets; no dedicated CLI in Stage 1. |
| Frontend server | `45.85.147.236` | Hosts QuestDB (ILP 9009, REST 9000), Postgres (5432), and the deployed trading-dashboard | Needs firewall ingress from backend for DB access; stores historical datasets. |
| Backend GPU node | `39.114.73.97` (vast.ai) | Runs Drogon API + CUDA/XGBoost workers | Consumes QuestDB/Postgres remotely; exposes controllers to frontend. |

## Stage 1.2 – Schema & Pipeline Hardening

### QuestDB Measurements (ILP)

| Measurement | Tags (`SYMBOL`) | Core fields | Purpose |
| --- | --- | --- | --- |
| `indicator_bars` | `dataset`, `source`, `granularity` | `date_i` (`LONG`), `time_i` (`LONG`), `timestamp_unix` (`LONG`), one field per indicator/target column (`DOUBLE`/`LONG`) | Stores normalized indicator datasets exported from ChronosFlow. |
| `walkforward_predictions` | `run_id`, `fold`, `dataset`, `target` | `bar_index` (`LONG`), `prediction` (`DOUBLE`), `target_value` (`DOUBLE`), `long_threshold` (`DOUBLE`), `short_threshold` (`DOUBLE`), optional `score` (`DOUBLE`) | Keeps per-bar model outputs with fold context; timestamps mirror indicator bars. |
| `trading_sim_traces` | `simulation_id`, `run_id`, `mode` (`long`/`short`/`dual`) | `entry_price`, `exit_price`, `position_size`, `pnl`, `return_pct`, `cumul_return_pct`, `entry_signal`, `exit_signal` (`DOUBLE`), `exit_timestamp_unix` (`LONG`) | Captures executed trades; QuestDB timestamp records entry time. A companion `trading_sim_equity` measurement can hold bar-by-bar equity curves if needed. |

*Example ILP line (indicator export):*
```
indicator_bars,dataset=btc_4h_v1,source=chronosflow,granularity=1h date_i=20240501i,time_i=140000i,timestamp_unix=1714572000i,macd=1.234,signal=0.987,target_close=0.42 1714572000000000000
```

### Postgres Schema (new)

| Table | Key columns | Description |
| --- | --- | --- |
| `indicator_datasets` | `dataset_id` (PK), `symbol`, `granularity`, `source`, `questdb_tag`, `row_count`, `first_bar_ts`, `last_bar_ts`, `created_at` | Registry for exported datasets; links QuestDB tag values to friendly metadata and availability windows. |
| `walkforward_runs` | `run_id` (PK, UUID), `dataset_id` (FK), `target_column`, `feature_columns` (JSONB), `hyperparameters` (JSONB), `walk_config` (JSONB), `status`, `requested_by`, `started_at`, `completed_at`, `duration_ms`, `summary_metrics` (JSONB) | Stores each walk-forward job request and aggregated metrics surfaced in UI. |
| `walkforward_folds` | PK `(run_id, fold_number)`, `train_start_idx`, `train_end_idx`, `test_start_idx`, `test_end_idx`, `samples_train`, `samples_test`, `best_iteration`, `best_score`, `thresholds` (JSONB), `metrics` (JSONB) | Fold-level detail (thresholds, hit rates, profit factors) referenced by frontend detail views. |
| `simulation_runs` | `simulation_id` (PK, UUID), `run_id` (FK), `dataset_id` (FK), `mode`, `config` (JSONB), `status`, `started_at`, `completed_at`, `summary_metrics` (JSONB), `questdb_namespace` | Tracks trade simulation requests and aggregated performance (total return, PF, drawdown, win rate). |
| `simulation_trade_buckets` | PK `(simulation_id, side)`, `trade_count`, `win_count`, `profit_factor`, `avg_return_pct`, `max_drawdown_pct`, `notes` | Aggregated trade statistics to complement per-trade QuestDB rows. |

*Indexes:* create B-tree indexes on `walkforward_runs(dataset_id, created_at DESC)` and `simulation_runs(run_id, created_at DESC)` to power listing endpoints; `walkforward_folds(run_id)` for detail retrieval.

### Export & Validation Plan
- **Manual export:** follow `docs/GUI_EXPORT_WORKFLOW.md` when pushing datasets from the Time Series window. Ensure table names and tags follow the conventions above.
- **Post-export verification:** run lightweight `SELECT` queries (row count, min/max timestamp, tag sanity) against QuestDB and record findings in the export log.
- **Backfill workflow:** maintain a simple spreadsheet or markdown log describing each dataset slug, measurement name, and validation query output.
- **Future automation:** CLI tooling and regression scripts can be revisited after Stage 1 once requirements stabilise.

### Outstanding Actions & Notes
- Ensure `backend/QUESTDB_INGESTION.md` and backend migrations stay in sync with the agreed schema.
- Frontend components operate in read-only mode until backend write endpoints are available.
- Manual export documentation lives in `docs/GUI_EXPORT_WORKFLOW.md`; update it alongside any process changes.
