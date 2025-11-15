export interface XGBoostThresholdSummary {
  long_percentile_95?: number;
  short_percentile_05?: number;
  long_optimal?: number;
  short_optimal?: number;
}

export interface XGBoostTransformParams {
  mean: number;
  std_dev: number;
  scaling_factor: number;
}

export interface XGBoostValidationMetrics {
  mse?: number;
  mae?: number;
  r2?: number;
}

export interface XGBoostPredictionSet {
  train: number[];
  validation: number[];
  test: number[];
}

export interface XGBoostProfitFactors {
  train_long?: number;
  test_long?: number;
  train_long_opt?: number;
  test_long_opt?: number;
  train_short?: number;
  test_short?: number;
  train_short_opt?: number;
  test_short_opt?: number;
}

export interface XGBoostTrainResult {
  dataset_id: string;
  feature_columns: string[];
  target_column: string;
  train_samples: number;
  validation_samples: number;
  test_samples: number;
  best_iteration: number;
  best_score: number;
  model_size_bytes?: number;
  transform_params: XGBoostTransformParams;
  thresholds: XGBoostThresholdSummary;
  validation_metrics: XGBoostValidationMetrics;
  test_metrics?: XGBoostValidationMetrics;
  predictions: XGBoostPredictionSet;
  actuals: XGBoostPredictionSet;
  timestamps: Record<'train' | 'validation' | 'test', number[]>;
  profit_factors?: XGBoostProfitFactors;
  feature_importance?: Record<string, number>;
  config?: Record<string, unknown>;
}

export interface XGBoostTrainResponse {
  type: 'train_response';
  request_id: string;
  success: boolean;
  result: XGBoostTrainResult;
}

export interface XGBoostPredictResponse {
  type: 'predict_response';
  request_id: string;
  success: boolean;
  result: {
    prediction: number;
    signal: number;
    signal_label?: 'long' | 'short' | 'neutral';
    thresholds?: XGBoostThresholdSummary;
  };
}

export type XGBoostServerMessage =
  | { type: 'session_init'; session_id: string }
  | { type: 'reconnect_response'; success: boolean; session_id: string; has_model: boolean }
  | { type: 'error'; request_id?: string; error: string; message?: string }
  | XGBoostTrainResponse
  | XGBoostPredictResponse
  | { type: 'session_info_response'; request_id: string; session: Record<string, unknown> };
