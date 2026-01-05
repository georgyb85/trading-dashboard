// Stage1 API TypeScript models

export interface Stage1DatasetSummary {
  dataset_id: string;
  dataset_slug: string;
  symbol: string;
  granularity: string;
  source: string;
  ohlcv_measurement: string;
  indicator_measurement: string;
  ohlcv_row_count: number;
  indicator_row_count: number;
  ohlcv_first_ts: number;
  ohlcv_last_ts: number;
  indicator_first_ts: number;
  indicator_last_ts: number;
  metadata: Record<string, unknown>;
}

export interface Stage1RunSummary {
  run_id: string;
  dataset_id: string;
  fold_count?: number; // Legacy field name
  feature_columns?: string[] | string; // Actual field name from API
  features?: string[] | string; // Legacy field name - Can be JSON string or array
  thresholds?: number[] | string; // Can be JSON string or array
  summary_metrics?: {
    folds?: number;
    hit_rate_long?: number;
    hit_rate_short?: number;
    hit_rate_overall?: number;
    pf_dual?: number;
    [key: string]: unknown;
  } | string; // Can be object or JSON string
  created_at: string;
  completed_at?: string;
  duration_ms?: number;
  target_column?: string;
  hyperparameters?: Record<string, unknown> | string;
  walk_config?: Record<string, unknown> | string;
  status?: string;
}

export interface Stage1FoldMetrics {
  fold_number: number;
  train_start_idx: number;
  train_end_idx: number;
  test_start_idx: number;
  test_end_idx: number;
  samples_train: number;
  samples_test: number;
  best_iteration: number | null;
  best_score: number | null;
  thresholds?: Record<string, number> | string; // Can be JSON string or object
  metrics?: Record<string, number> | string; // Can be JSON string or object
}

export interface Stage1RunDetail {
  run_id: string;
  dataset_id: string;
  dataset_slug?: string;
  target_column?: string;
  feature_columns?: string[] | string; // Can be JSON string or array
  hyperparameters?: Record<string, unknown> | string; // Can be JSON string or object
  walk_config?: Record<string, unknown> | string; // Can be JSON string or object
  summary_metrics?: Record<string, unknown> | string; // Can be JSON string or object
  fold_count?: number;
  folds?: Stage1FoldMetrics[];
  created_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface Stage1IndicatorRow {
  timestamp?: string;
  timestamp_unix?: number;
  ts?: string;
  time?: string;
  [key: string]: unknown;
}

export interface Stage1IndicatorResponse {
  measurement: string;
  count: number;
  rows: Stage1IndicatorRow[];
}

export interface Stage1DatasetManifest {
  version: number;
  dataset_id: string;
  dataset_slug: string;
  granularity: string;
  source: string;
  ohlcv_measurement: string;
  indicator_measurement: string;
  bar_interval_ms: number;
  lookback_rows: number;
  first_ohlcv_timestamp_ms: number;
  last_ohlcv_timestamp_ms: number;
  first_indicator_timestamp_ms: number;
  last_indicator_timestamp_ms: number;
  ohlcv_rows: number;
  indicator_rows: number;
  exported_at?: string;
}

export interface Stage1IndexMapRow {
  index: number;
  timestamp_ms: number;
}

export interface Stage1IndexMapResponse {
  measurement: string;
  start_index: number;
  end_index: number;
  rows: Stage1IndexMapRow[];
}

// API Response wrapper
export interface Stage1ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Indicator Builder API types
export interface IndicatorDefinition {
  variable_name: string;
  indicator_type: string;
  params: number[];
}

export interface ValidateScriptRequest {
  script: string;
}

export interface ValidateScriptResponse {
  success: boolean;
  message: string;
  count?: number;
  definitions?: IndicatorDefinition[];
}

export interface BuildIndicatorsRequest {
  dataset_slug?: string;
  dataset_id?: string;
  rows?: number;
  script: string;
  ohlcv_rows?: BinanceOhlcvRow[];
}

export interface BuildIndicatorsResponse {
  success: boolean;
  message: string;
  row_count?: number;
  timestamps?: number[];
  indicator_names?: string[];
  indicator_values?: Record<string, (number | null)[]>;
}

export interface BinanceOhlcvRow {
  timestamp_ms: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinanceDownloadRequest {
  from_date: string;
  to_date: string;
  symbol?: string;
  interval?: string;
  parallel_jobs?: number;
}

export interface BinanceDownloadResponse {
  success: boolean;
  message: string;
  row_count?: number;
  rows?: BinanceOhlcvRow[];
}

// Trade Simulation API types
export type ThresholdChoice = 'OptimalROC' | 'Percentile95_5' | 'ZeroCrossover';

export interface TradeConfig {
  position_size: number;
  use_signal_exit: boolean;
  exit_strength_pct: number;
  honor_signal_reversal: boolean;
  threshold_choice: ThresholdChoice;
  use_stop_loss: boolean;
  use_atr_stop_loss: boolean;
  stop_loss_pct: number;
  atr_multiplier: number;
  atr_period: number;
  stop_loss_cooldown_bars: number;
  use_take_profit: boolean;
  use_atr_take_profit: boolean;
  take_profit_pct: number;
  atr_tp_multiplier: number;
  atr_tp_period: number;
  use_time_exit: boolean;
  max_holding_bars: number;
  use_limit_orders: boolean;
  limit_order_window: number;
  limit_order_offset: number;
}

export interface StressTestConfig {
  enable?: boolean;
  bootstrap_iterations: number;
  mcpt_iterations: number;
  seed: number;
}

// ---------------------------------------------------------------------------
// Executor Config + Bindings (Stage1 persistence)
// ---------------------------------------------------------------------------

export type ExecutorThresholdChoice = "OptimalROC" | "Percentile" | "ZeroCrossover";

export interface Stage1ExecutorConfig {
  config_id: string;
  name: string;
  description?: string;
  threshold_choice: ExecutorThresholdChoice;

  position_size: number;

  use_limit_orders: boolean;
  limit_order_window: number;
  limit_order_offset: number;

  use_signal_exit: boolean;
  exit_strength_pct: number;
  honor_signal_reversal: boolean;

  use_stop_loss: boolean;
  use_atr_stop_loss: boolean;
  stop_loss_pct: number;
  atr_multiplier: number;
  atr_period: number;
  stop_loss_cooldown_bars: number;

  use_take_profit: boolean;
  use_atr_take_profit: boolean;
  take_profit_pct: number;
  atr_tp_multiplier: number;
  atr_tp_period: number;

  use_time_exit: boolean;
  max_holding_bars: number;

  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  extra_config?: Record<string, unknown>;
}

export interface Stage1ExecutorConfigUpsertRequest {
  name: string;
  description?: string;
  threshold_choice: ExecutorThresholdChoice;

  position_size: number;

  use_limit_orders: boolean;
  limit_order_window: number;
  limit_order_offset: number;

  use_signal_exit: boolean;
  exit_strength_pct: number;
  honor_signal_reversal: boolean;

  use_stop_loss: boolean;
  use_atr_stop_loss: boolean;
  stop_loss_pct: number;
  atr_multiplier: number;
  atr_period: number;
  stop_loss_cooldown_bars: number;

  use_take_profit: boolean;
  use_atr_take_profit: boolean;
  take_profit_pct: number;
  atr_tp_multiplier: number;
  atr_tp_period: number;

  use_time_exit: boolean;
  max_holding_bars: number;

  extra_config?: Record<string, unknown>;
  created_by?: string;
  changed_by?: string;
  change_reason?: string;
}

export interface Stage1ExecutorBinding {
  binding_id: string;
  trader_id?: string;
  model_id: string;
  stream_id: string;
  symbol: string;
  exchange: string;
  executor_config_id: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Stage1ExecutorBindingUpsertRequest {
  trader_id?: string;
  model_id: string;
  stream_id: string;
  symbol: string;
  exchange: string;
  executor_config_id: string;
  enabled: boolean;
  priority: number;
  created_by?: string;
}

// ---------------------------------------------------------------------------
// Trader Deployments (Stage1 persistence)
// ---------------------------------------------------------------------------

export interface Stage1TraderDeployment {
  deployment_id: string;
  trader_id: string;
  model_id: string;
  enabled: boolean;
  priority: number;
  dataset_id?: string;
  run_id?: string;
  stream_id: string;
  symbol: string;
  exchange: string;
  feature_hash: string;

  long_threshold: number;
  short_threshold: number;
  long_threshold_optimal?: number;
  long_threshold_percentile?: number;
  short_threshold_optimal?: number;
  short_threshold_percentile?: number;
  zero_crossover_enabled: boolean;

  target_horizon_bars: number;
  threshold_method: ExecutorThresholdChoice;
  max_holding_bars: number;
  val_split_ratio: number;
  cooldown_bars: number;

  artifact_ref: string;
  artifact_sha256: string;

  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Stage1TraderDeploymentUpsertRequest {
  model_id: string;
  enabled: boolean;
  priority: number;
  dataset_id?: string;
  run_id?: string;
  stream_id: string;
  symbol: string;
  exchange: string;
  feature_hash: string;

  threshold_method: ExecutorThresholdChoice;
  target_horizon_bars: number;
  zero_crossover_enabled?: boolean;

  long_threshold_optimal?: number;
  short_threshold_optimal?: number;
  long_threshold_percentile?: number;
  short_threshold_percentile?: number;

  max_holding_bars?: number;
  val_split_ratio?: number;
  cooldown_bars?: number;

  artifact: {
    sha256: string;
    format: "ubj" | "json" | "bin";
    content_base64?: string;
  };

  created_by?: string;
}

export interface SimulateTradesRequest {
  dataset_id?: string;
  dataset_slug?: string;
  run_id: string;
  trade_config: TradeConfig;
  stress_test: StressTestConfig;
}

export interface Trade {
  fold: number;
  side: 'long' | 'short';
  entry_time: string;
  exit_time: string;
  exit_reason: 'stop_loss' | 'take_profit' | 'time_exit' | 'signal' | 'signal_reversal';
  entry_price: number;
  exit_price: number;
  entry_signal: number;
  exit_signal: number;
  pnl: number;
  return_pct: number;
  cumulative_return_pct: number;
}

export interface PerformanceMetrics {
  // Backend can return either field name variant
  total_return_pct?: number;
  return_pct?: number;
  profit_factor: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  max_drawdown_pct?: number;
  win_rate?: number;
  total_trades?: number;
  [key: string]: unknown;
}

export interface StressTestInterval {
  estimate: number;
  ci90_low: number;
  ci90_high: number;
  ci95_low: number;
  ci95_high: number;
}

export interface StressTestResult {
  sample_size: number;
  bootstrap_iterations?: number;
  mcpt_iterations?: number;
  computed?: boolean;
  sharpe?: StressTestInterval;
  profit_factor?: StressTestInterval;
  total_return_pct?: StressTestInterval;
  max_drawdown?: StressTestInterval;
  drawdown?: {
    q50: number;
    q90: number;
    q95: number;
    q99: number;
  };
  pvalues?: {
    total_return?: number;
    max_drawdown?: number;
    sharpe?: number;
    profit_factor?: number;
  };
}

export interface PnLPoint {
  timestamp: number;
  pnl: number;
}

export interface SimulateTradesResponse {
  success: boolean;
  message?: string;
  performance?: PerformanceMetrics;
  long_only?: PerformanceMetrics;
  short_only?: PerformanceMetrics;
  buy_hold?: PerformanceMetrics;
  stress_tests?: {
    combined?: StressTestResult;
    long_only?: StressTestResult;
    short_only?: StressTestResult;
  };
  trades?: Trade[];
  strategy_pnl?: PnLPoint[];
  buy_hold_pnl?: PnLPoint[];
}
