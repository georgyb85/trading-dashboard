// Stage 1 API endpoints aligned with backend mock controllers

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

// Aggregate export
export const api = {
  datasets: datasetApi,
  walkforward: walkforwardApi,
  tradesim: tradeSimulationApi,
};

export default api;
