export interface GoLiveRequest {
  run_id: string;
  indicator_script: string;
}

export interface GoLiveResponse {
  success: boolean;
  run_id: string;
}

export interface ActiveModelResponse {
  model_id: string;
  feature_hash: string;
  long_threshold: number;
  short_threshold: number;
  trained_at_ms: number;
}

export interface KrakenApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
