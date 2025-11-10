// Stage1 API TypeScript models

export interface Stage1DatasetSummary {
  dataset_id: string;
  dataset_slug: string;
  symbol: string;
  ohlcv_measurement: string;
  indicator_measurement: string;
  ohlcv_row_count: number;
  indicator_row_count: number;
  updated_at: string;
}

export interface Stage1RunSummary {
  run_id: string;
  dataset_id: string;
  dataset_slug: string;
  prediction_measurement: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
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
  thresholds: Record<string, number>;
  metrics: Record<string, number>;
}

export interface Stage1RunDetail extends Stage1RunSummary {
  target_column: string;
  feature_columns: string[];
  hyperparameters: Record<string, unknown>;
  walk_config: Record<string, unknown>;
  summary_metrics: Record<string, unknown>;
  folds: Stage1FoldMetrics[];
}

// API Response wrapper
export interface Stage1ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
