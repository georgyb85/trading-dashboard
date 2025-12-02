import type { Stage1RunDetail } from '@/lib/stage1/types';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';

export interface GoLiveRequest {
  run_id: string;
  indicator_script: string;
  run?: Stage1RunDetail;
}

export interface GoLiveResponse {
  success: boolean;
  run_id: string;
}

// Basic active model info (always available)
export interface ActiveModelBasic {
  model_id: string;
  feature_hash: string;
  long_threshold: number;
  short_threshold: number;
  trained_at_ms: number;
  best_score?: number;
}

// Full active model response with training results for rich visualizations
export interface ActiveModelResponse extends ActiveModelBasic {
  // Full XGBoost training result for visualizations (predictions, actuals, ROC, etc.)
  train_result?: XGBoostTrainResult;
}

export interface KrakenApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
