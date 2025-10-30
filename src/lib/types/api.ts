// Stage 1 API Types aligned with backend DTOs

// Indicator datasets (QuestDB exports)
export interface IndicatorDataset {
  dataset_id: string;
  symbol: string;
  granularity: string;
  source: string;
  questdb_tag: string;
  row_count: number;
  first_bar_ts: string;
  last_bar_ts: string;
  created_at: string;
}

// Walk-forward run summary
export interface WalkforwardRun {
  run_id: string;
  dataset_id: string;
  target_column: string;
  feature_columns: string[];
  hyperparameters: Record<string, unknown>;
  walk_config: Record<string, unknown>;
  status: string;
  requested_by?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  summary_metrics: Record<string, unknown>;
  created_at: string;
}

export interface WalkforwardFold {
  run_id: string;
  fold_number: number;
  train_start_idx: number;
  train_end_idx: number;
  test_start_idx: number;
  test_end_idx: number;
  samples_train: number;
  samples_test: number;
  best_iteration?: number;
  best_score?: number;
  thresholds: Record<string, unknown>;
  metrics: Record<string, unknown>;
}

export interface WalkforwardRunDetail {
  run: WalkforwardRun;
  folds: WalkforwardFold[];
}

// Trade simulation summaries
export interface TradeSimulationRun {
  simulation_id: string;
  run_id: string;
  dataset_id: string;
  mode: string;
  config: Record<string, unknown>;
  status: string;
  summary_metrics: Record<string, unknown>;
  questdb_namespace: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SimulationBucket {
  simulation_id: string;
  side: string;
  trade_count: number;
  win_count: number;
  profit_factor?: number;
  avg_return_pct?: number;
  max_drawdown_pct?: number;
  notes?: string;
}

export interface TradeSimulationDetail {
  run: TradeSimulationRun;
  buckets: SimulationBucket[];
}

// Generic API response envelope
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
