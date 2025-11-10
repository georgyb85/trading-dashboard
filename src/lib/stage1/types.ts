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
  fold_count?: number;
  features?: string[];
  thresholds?: number[];
  created_at: string;
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
  thresholds?: Record<string, number>; // Backend now returns as JSON object
  metrics?: Record<string, number>; // Backend now returns as JSON object
}

export interface Stage1RunDetail {
  run_id: string;
  dataset_id: string;
  dataset_slug?: string;
  target_column?: string;
  feature_columns?: string[]; // Backend now returns as JSON array
  hyperparameters?: Record<string, unknown>; // Backend now returns as JSON object
  walk_config?: Record<string, unknown>; // Backend now returns as JSON object
  summary_metrics?: Record<string, unknown>; // Backend now returns as JSON object
  fold_count?: number;
  folds?: Stage1FoldMetrics[];
  created_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

// API Response wrapper
export interface Stage1ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
