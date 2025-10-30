-- Stage 1 Postgres Schema for Trading Platform
-- Frontend server: 45.85.147.236
-- Database: stage1_trading
-- Role: stage1_app

-- ============================================================================
-- TABLE: indicator_datasets
-- Registry for exported datasets; stores the dynamically generated QuestDB
-- measurement name and column metadata.
-- ============================================================================
CREATE TABLE IF NOT EXISTS indicator_datasets (
    dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(50) NOT NULL,
    granularity VARCHAR(20) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'chronosflow',
    questdb_measurement VARCHAR(255) NOT NULL UNIQUE,
    column_schema JSONB NOT NULL,
    row_count BIGINT,
    first_bar_ts TIMESTAMPTZ,
    last_bar_ts TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_indicator_datasets_symbol ON indicator_datasets(symbol);
CREATE INDEX idx_indicator_datasets_created_at ON indicator_datasets(created_at DESC);

-- ============================================================================
-- TABLE: walkforward_runs
-- Captures configuration, metrics, and links to the QuestDB measurement
-- containing predictions/thresholds (e.g., btc25_run1).
-- ============================================================================
CREATE TABLE IF NOT EXISTS walkforward_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES indicator_datasets(dataset_id) ON DELETE CASCADE,
    prediction_measurement VARCHAR(255) NOT NULL,
    target_column VARCHAR(100) NOT NULL,
    feature_columns JSONB NOT NULL,
    hyperparameters JSONB NOT NULL,
    walk_config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    requested_by VARCHAR(100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms BIGINT,
    summary_metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_walkforward_runs_dataset_id ON walkforward_runs(dataset_id, created_at DESC);
CREATE INDEX idx_walkforward_runs_status ON walkforward_runs(status);
CREATE INDEX idx_walkforward_runs_created_at ON walkforward_runs(created_at DESC);

-- ============================================================================
-- TABLE: walkforward_folds
-- Fold-level detail (thresholds, hit rates, profit factors) referenced by
-- frontend detail views.
-- ============================================================================
CREATE TABLE IF NOT EXISTS walkforward_folds (
    run_id UUID REFERENCES walkforward_runs(run_id) ON DELETE CASCADE,
    fold_number INTEGER NOT NULL,
    train_start_idx BIGINT NOT NULL,
    train_end_idx BIGINT NOT NULL,
    test_start_idx BIGINT NOT NULL,
    test_end_idx BIGINT NOT NULL,
    samples_train INTEGER NOT NULL,
    samples_test INTEGER NOT NULL,
    best_iteration INTEGER,
    best_score DOUBLE PRECISION,
    thresholds JSONB,
    metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, fold_number)
);

CREATE INDEX idx_walkforward_folds_run_id ON walkforward_folds(run_id);

-- ============================================================================
-- TABLE: simulation_runs
-- Tracks trading simulations, including the QuestDB measurement used for
-- predictions and the input parameters applied.
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulation_runs (
    simulation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES walkforward_runs(run_id) ON DELETE SET NULL,
    dataset_id UUID REFERENCES indicator_datasets(dataset_id) ON DELETE CASCADE,
    input_run_measurement VARCHAR(255) NOT NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('long', 'short', 'dual')),
    config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    summary_metrics JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulation_runs_run_id ON simulation_runs(run_id, created_at DESC);
CREATE INDEX idx_simulation_runs_dataset_id ON simulation_runs(dataset_id);
CREATE INDEX idx_simulation_runs_status ON simulation_runs(status);
CREATE INDEX idx_simulation_runs_created_at ON simulation_runs(created_at DESC);

-- ============================================================================
-- TABLE: simulation_trades
-- Persists per-trade outcomes so backend/frontend can display exact fills
-- without relying on QuestDB exports.
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulation_trades (
    trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID REFERENCES simulation_runs(simulation_id) ON DELETE CASCADE,
    bar_timestamp TIMESTAMPTZ NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
    size DOUBLE PRECISION NOT NULL,
    entry_price DOUBLE PRECISION NOT NULL,
    exit_price DOUBLE PRECISION,
    pnl DOUBLE PRECISION,
    return_pct DOUBLE PRECISION,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulation_trades_simulation_id ON simulation_trades(simulation_id);
CREATE INDEX idx_simulation_trades_bar_timestamp ON simulation_trades(bar_timestamp);

-- ============================================================================
-- TABLE: simulation_trade_buckets
-- Aggregated trade statistics complementing per-trade rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulation_trade_buckets (
    simulation_id UUID REFERENCES simulation_runs(simulation_id) ON DELETE CASCADE,
    side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short', 'all')),
    trade_count INTEGER NOT NULL DEFAULT 0,
    win_count INTEGER NOT NULL DEFAULT 0,
    profit_factor DOUBLE PRECISION,
    avg_return_pct DOUBLE PRECISION,
    max_drawdown_pct DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (simulation_id, side)
);

CREATE INDEX idx_simulation_trade_buckets_simulation_id ON simulation_trade_buckets(simulation_id);

-- ============================================================================
-- Automatic timestamp update trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_indicator_datasets_updated_at BEFORE UPDATE ON indicator_datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- End of schema
-- ============================================================================
