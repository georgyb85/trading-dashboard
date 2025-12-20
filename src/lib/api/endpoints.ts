// Trader API endpoints (Kraken) aligned with backend controllers

import { apiClient } from './client';
import type {
  IndicatorDataset,
  WalkforwardRun,
  WalkforwardRunDetail,
  TradeSimulationRun,
  TradeSimulationDetail,
  ApiResponse,
} from '@/lib/types/api';

// ---------------------------------------------------------------------------
// Indicator datasets (ChronosFlow exports)
// ---------------------------------------------------------------------------

export const datasetApi = {
  /**
   * GET /api/indicators/datasets
   */
  async getAll(): Promise<ApiResponse<IndicatorDataset[]>> {
    return apiClient.get<IndicatorDataset[]>('/api/indicators/datasets');
  },

  /**
   * GET /api/indicators/datasets/{id}
   */
  async getById(id: string): Promise<ApiResponse<IndicatorDataset>> {
    return apiClient.get<IndicatorDataset>(`/api/indicators/datasets/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Walk-forward runs
// ---------------------------------------------------------------------------

export const walkforwardApi = {
  /**
   * GET /api/walkforward/runs
   */
  async getRuns(): Promise<ApiResponse<WalkforwardRun[]>> {
    return apiClient.get<WalkforwardRun[]>('/api/walkforward/runs');
  },

  /**
   * GET /api/walkforward/runs/{id}
   *
   * Returns `{ run, folds }`
   */
  async getRunDetail(id: string): Promise<ApiResponse<WalkforwardRunDetail>> {
    return apiClient.get<WalkforwardRunDetail>(`/api/walkforward/runs/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Trading simulation runs
// ---------------------------------------------------------------------------

export const tradeSimulationApi = {
  /**
   * GET /api/tradesim/runs
   */
  async getRuns(): Promise<ApiResponse<TradeSimulationRun[]>> {
    return apiClient.get<TradeSimulationRun[]>('/api/tradesim/runs');
  },

  /**
   * GET /api/tradesim/runs/{id}
   *
   * Returns `{ run, buckets }`
   */
  async getRunDetail(id: string): Promise<ApiResponse<TradeSimulationDetail>> {
    return apiClient.get<TradeSimulationDetail>(`/api/tradesim/runs/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Live Model API (Model-Executor Decoupling)
// ---------------------------------------------------------------------------

export interface LiveModel {
  model_id: string;
  run_id: string;
  stream_id: string;
  dataset_id: string;
  feature_count: number;
  feature_hash: string;
  long_threshold: number;
  short_threshold: number;
  target_horizon_bars: number;
  trained_at_ms: number;
  next_retrain_ms: number;
  active: boolean;
  status: string;
  // Training config
  train_size: number;
  train_start_ts: number;
  train_end_ts: number;
  val_start_ts: number;
  val_end_ts: number;
  // XGBoost config
  xgb_max_depth: number;
  xgb_eta: number;
  xgb_n_rounds: number;
  xgb_objective: string;
  // Metrics
  mae: number;
  mse: number;
  r2: number;
  sample_count: number;
  // Executor status (new)
  has_executor?: boolean;
  executor_enabled?: boolean;
}

export interface LivePrediction {
  ts_ms: number;
  prediction: number;
  long_threshold: number;
  short_threshold: number;
  feature_hash: string;
  model_id: string;
  matched: boolean;
  actual?: number;
}

export interface LiveModelsResponse {
  models: LiveModel[];
  stream_manager_available: boolean;
  next_retrain_ms: number;
}

export interface LivePredictionsResponse {
  model_id: string;
  stream_id: string;
  predictions: LivePrediction[];
  total_count: number;
  target_horizon_bars: number;
}

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

export const liveModelApi = {
  /**
   * GET /api/live/models - List all active models
   */
  async getModels(): Promise<ApiResponse<LiveModelsResponse>> {
    return apiClient.get<LiveModelsResponse>('/api/live/models');
  },

  /**
   * GET /api/live/models/{id}/metrics - Get model metrics
   */
  async getMetrics(modelId: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/live/models/${modelId}/metrics`);
  },

  /**
   * GET /api/live/predictions - Get predictions for a model
   */
  async getPredictions(modelId: string, limit = 100): Promise<ApiResponse<LivePredictionsResponse>> {
    return apiClient.get<LivePredictionsResponse>('/api/live/predictions', { model_id: modelId, limit });
  },

  /**
   * GET /api/live/health - Get pipeline health
   */
  async getHealth(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/live/health');
  },

  /**
   * POST /api/live/models/deploy - Deploy model (prediction-only)
   */
  async deployModel(runId: string, streamId?: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/live/models/deploy', { run_id: runId, stream_id: streamId });
  },

  /**
   * POST /api/live/models/{id}/executor - Attach executor
   */
  async attachExecutor(modelId: string, config: ExecutorConfig): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/live/models/${modelId}/executor`, config);
  },

  /**
   * PUT /api/live/models/{id}/executor - Update executor
   */
  async updateExecutor(modelId: string, config: ExecutorConfig): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/api/live/models/${modelId}/executor`, config);
  },

  /**
   * DELETE /api/live/models/{id}/executor - Detach executor
   */
  async detachExecutor(modelId: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/live/models/${modelId}/executor`);
  },

  /**
   * POST /api/live/models/{id}/undeploy - Undeploy model
   */
  async undeployModel(modelId: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/live/models/${modelId}/undeploy`);
  },

  /**
   * POST /api/live/go - Legacy: deploy + attach in one call
   */
  async goLive(config: any): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/live/go', config);
  },
};

// Aggregate export
export const api = {
  datasets: datasetApi,
  walkforward: walkforwardApi,
  tradesim: tradeSimulationApi,
  liveModel: liveModelApi,
};

export default api;
