import type { Stage1RunDetail } from '@/lib/stage1/types';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';

export interface GoLiveRequest {
  run_id: string;
  indicator_script: string;
  run?: Stage1RunDetail;
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
