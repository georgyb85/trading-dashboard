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
export type ActiveModelResponse = LiveModelDetail;

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

// Health API Types (verified from live_model_api.cpp:1027-1098)

export interface StreamHealth {
  stream_id: string;
  last_bar_ts: number;
  last_indicator_ts: number;
  ohlcv_buffer_size: number;
  indicator_buffer_size: number;
  feature_count: number;
  target_count: number;
  max_target_horizon: number;
  feature_hash: number;
  stale: boolean;
}

export interface QueueHealth {
  capacity: number;
  pending: number;
}

export interface ModelHealth {
  model_id: string;
  status: string;
  sample_count?: number;
  mae?: number;
  last_update_ts?: number;
  stale?: boolean;
}

export interface HealthResponse {
  streams: StreamHealth[];
  queues: {
    indicator_bar: QueueHealth;
    inference_indicator: QueueHealth;
    trader_bar: QueueHealth;
    trader_prediction: QueueHealth;
  };
  uptime_ms: number;
  pipeline: string;
  models: ModelHealth[];
  active_model_id: string | null;
  trading_enabled?: boolean;
  recovery_state?: string;
  boot_id?: string;
  reconciliation_started_ms?: number;
  activated_ms?: number;
  recovery_reason?: string;
  recovery_details_json?: string;
  error?: string;
}

// /api/live/recovery/reset (operator endpoint)
export interface RecoveryResetResponse {
  success: boolean;
  state?: string;
  boot_id?: string;
  stage1_upserts?: number;
  reconciliation?: {
    success: boolean;
    positions_recovered: number;
    orphan_orders_found: number;
    pending_orders_canceled: number;
    unknown_models_skipped: number;
    first_unattributed_clordid?: string;
  };
  error?: string;
  message?: string;
}

// /usage WebSocket message types (verified from usage_stream.cpp)

export interface UsageUpdate {
  type: 'usage_update';
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  gpu_percent?: number;
  gpu_mem_used_mb?: number;
  gpu_mem_total_mb?: number;
  timestamp: number;
  message_rates?: {
    total_per_sec: number;
    trades_per_sec: number;
    orderbooks_per_sec: number;
  };
}

export interface SystemInfo {
  type: 'system_info';
  cpu_count: number;
  cpu_model: string;
  ram_total_mb: number;
  gpu_count: number;
  hostname: string;
  timestamp: number;
  gpus: Array<{
    index: number;
    name: string;
    memory_mb: number;
  }>;
}

export type UsageMessage = UsageUpdate | SystemInfo;
