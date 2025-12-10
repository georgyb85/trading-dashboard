import type { Stage1RunDetail } from '@/lib/stage1/types';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';

export interface GoLiveRequest {
  run_id: string;
  timeframe?: string;  // defaults to "1h"
  // indicator_script removed - backend uses global engine
  run?: Stage1RunDetail;
}

export interface AvailableFeaturesResponse {
  features: string[];
  feature_hash: string;
  timeframe: string;
}

export interface GoLiveResponse {
  success: boolean;
  model_id: string;
  run_id: string;
  dataset_id?: string;
  version?: number;
  train_result?: XGBoostTrainResult;
}

export interface LiveModelSummary {
  model_id: string;
  run_id: string;
  stream_id?: string;
  dataset_id: string;
  status: 'active' | 'inactive';
  version: number;
  trained_at_ms: number;
  next_retrain_ms?: number;
  long_threshold?: number;
  short_threshold?: number;
  best_score?: number;
  feature_hash?: string;
  indicator_hash?: string;
  target_horizon_bars?: number;

  // Executor status (Model-Executor Decoupling)
  has_executor?: boolean;
  executor_enabled?: boolean;

  // Training config (ACTUAL values from training, -1 = legacy/not set)
  train_size?: number;
  train_test_gap?: number;
  val_split_ratio?: number;

  // Actual training timestamps
  train_start_ts?: number;
  train_end_ts?: number;
  val_start_ts?: number;
  val_end_ts?: number;

  // XGBoost config
  xgb_max_depth?: number;
  xgb_eta?: number;
  xgb_subsample?: number;
  xgb_colsample_bytree?: number;
  xgb_n_rounds?: number;

  // XGBoost objective and related params (CRITICAL: no hardcoding allowed)
  xgb_objective?: string;       // e.g., "reg:squarederror", "reg:quantileerror"
  xgb_quantile_alpha?: number;  // Used only when objective is "reg:quantileerror"
  xgb_lambda?: number;          // L2 regularization
  xgb_min_child_weight?: number; // Minimum sum of instance weight in child
}

// Executor configuration for Model-Executor Decoupling
export interface ExecutorConfig {
  stream_id: string;
  symbol: string;
  exchange: 'kraken' | 'binance';
  long_threshold: number;
  short_threshold: number;
  position_size_pct: number;
  stop_loss_atr_mult: number;
  take_profit_atr_mult: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  max_bars_held: number;
  stop_loss_cooldown_bars: number;
  max_positions: number;
  max_equity_pct: number;
  max_position_notional: number;
  target_horizon_bars?: number;
  enabled?: boolean;
}

export interface LiveModelDetail extends LiveModelSummary {
  train_result?: XGBoostTrainResult;
}

// Full active model response with training results for rich visualizations
export interface ActiveModelResponse extends LiveModelDetail {}

export interface LiveModelMetricsResponse {
  model_id: string;
  run_id?: string;
  dataset_id?: string;
  train_result: XGBoostTrainResult;
  target_horizon_bars?: number;
}

export interface LivePrediction {
  ts_ms: number;
  model_id: string;
  prediction: number;
  long_threshold?: number;
  short_threshold?: number;
  actual?: number | null;
  trigger?: 'long_opt' | 'short_opt' | 'long_p95' | 'short_p5' | null;
}

export interface LiveTargetUpdate {
  target: string;
  ts_ms: number;
  value: number | null;
  model_id?: string;
}

export interface KrakenApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
