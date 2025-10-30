// Typed API endpoints for Stage 1 backend

import { apiClient } from './client';
import type {
  Dataset,
  Feature,
  Target,
  WalkforwardRun,
  WalkforwardFold,
  WalkforwardConfig,
  TradeSimulationRun,
  Trade,
  TradeSimulationConfig,
  LfsAnalysisRun,
  LfsConfig,
  PaginatedResponse,
  ApiResponse,
} from '@/lib/types/api';

// ============================================================================
// Dataset Endpoints
// ============================================================================

export const datasetApi = {
  /**
   * Get all datasets
   * GET /api/datasets
   */
  getAll: async (): Promise<ApiResponse<Dataset[]>> => {
    return apiClient.get<Dataset[]>('/api/datasets');
  },

  /**
   * Get a single dataset by ID
   * GET /api/datasets/:id
   */
  getById: async (id: number): Promise<ApiResponse<Dataset>> => {
    return apiClient.get<Dataset>(`/api/datasets/${id}`);
  },

  /**
   * Get features for a dataset
   * GET /api/datasets/:id/features
   */
  getFeatures: async (datasetId: number): Promise<ApiResponse<Feature[]>> => {
    return apiClient.get<Feature[]>(`/api/datasets/${datasetId}/features`);
  },

  /**
   * Get targets for a dataset
   * GET /api/datasets/:id/targets
   */
  getTargets: async (datasetId: number): Promise<ApiResponse<Target[]>> => {
    return apiClient.get<Target[]>(`/api/datasets/${datasetId}/targets`);
  },
};

// ============================================================================
// Walkforward Endpoints
// ============================================================================

export const walkforwardApi = {
  /**
   * Get all walkforward runs
   * GET /api/walkforward/runs
   */
  getRuns: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PaginatedResponse<WalkforwardRun>>> => {
    return apiClient.get<PaginatedResponse<WalkforwardRun>>('/api/walkforward/runs', params);
  },

  /**
   * Get a single walkforward run by ID
   * GET /api/walkforward/runs/:id
   */
  getRunById: async (id: number): Promise<ApiResponse<WalkforwardRun>> => {
    return apiClient.get<WalkforwardRun>(`/api/walkforward/runs/${id}`);
  },

  /**
   * Create a new walkforward run
   * POST /api/walkforward/runs
   */
  createRun: async (config: WalkforwardConfig): Promise<ApiResponse<WalkforwardRun>> => {
    return apiClient.post<WalkforwardRun>('/api/walkforward/runs', { config });
  },

  /**
   * Get folds for a walkforward run
   * GET /api/walkforward/runs/:id/folds
   */
  getFolds: async (runId: number): Promise<ApiResponse<WalkforwardFold[]>> => {
    return apiClient.get<WalkforwardFold[]>(`/api/walkforward/runs/${runId}/folds`);
  },

  /**
   * Get a specific fold
   * GET /api/walkforward/runs/:runId/folds/:foldNumber
   */
  getFold: async (runId: number, foldNumber: number): Promise<ApiResponse<WalkforwardFold>> => {
    return apiClient.get<WalkforwardFold>(`/api/walkforward/runs/${runId}/folds/${foldNumber}`);
  },

  /**
   * Delete a walkforward run
   * DELETE /api/walkforward/runs/:id
   */
  deleteRun: async (id: number): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/walkforward/runs/${id}`);
  },
};

// ============================================================================
// Trade Simulation Endpoints
// ============================================================================

export const tradeSimulationApi = {
  /**
   * Get all trade simulation runs
   * GET /api/tradesim/runs
   */
  getRuns: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PaginatedResponse<TradeSimulationRun>>> => {
    return apiClient.get<PaginatedResponse<TradeSimulationRun>>('/api/tradesim/runs', params);
  },

  /**
   * Get a single trade simulation run by ID
   * GET /api/tradesim/runs/:id
   */
  getRunById: async (id: number): Promise<ApiResponse<TradeSimulationRun>> => {
    return apiClient.get<TradeSimulationRun>(`/api/tradesim/runs/${id}`);
  },

  /**
   * Create a new trade simulation run
   * POST /api/tradesim/runs
   */
  createRun: async (config: TradeSimulationConfig): Promise<ApiResponse<TradeSimulationRun>> => {
    return apiClient.post<TradeSimulationRun>('/api/tradesim/runs', { config });
  },

  /**
   * Get trades for a simulation run
   * GET /api/tradesim/runs/:id/trades
   */
  getTrades: async (
    simulationId: number,
    params?: {
      tradeType?: 'Long' | 'Short';
      limit?: number;
      offset?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<Trade>>> => {
    return apiClient.get<PaginatedResponse<Trade>>(
      `/api/tradesim/runs/${simulationId}/trades`,
      params
    );
  },

  /**
   * Delete a trade simulation run
   * DELETE /api/tradesim/runs/:id
   */
  deleteRun: async (id: number): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/tradesim/runs/${id}`);
  },
};

// ============================================================================
// LFS (Local Feature Selection) Endpoints
// ============================================================================

export const lfsApi = {
  /**
   * Get all LFS analysis runs
   * GET /api/lfs/runs
   */
  getRuns: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<PaginatedResponse<LfsAnalysisRun>>> => {
    return apiClient.get<PaginatedResponse<LfsAnalysisRun>>('/api/lfs/runs', params);
  },

  /**
   * Get a single LFS analysis run by ID
   * GET /api/lfs/runs/:id
   */
  getRunById: async (id: number): Promise<ApiResponse<LfsAnalysisRun>> => {
    return apiClient.get<LfsAnalysisRun>(`/api/lfs/runs/${id}`);
  },

  /**
   * Create a new LFS analysis run
   * POST /api/lfs/runs
   */
  createRun: async (params: {
    datasetId: number;
    targetName: string;
    featureNames: string[];
    config: LfsConfig;
  }): Promise<ApiResponse<LfsAnalysisRun>> => {
    return apiClient.post<LfsAnalysisRun>('/api/lfs/runs', params);
  },

  /**
   * Delete an LFS analysis run
   * DELETE /api/lfs/runs/:id
   */
  deleteRun: async (id: number): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/api/lfs/runs/${id}`);
  },
};

// Export all APIs
export const api = {
  datasets: datasetApi,
  walkforward: walkforwardApi,
  tradesim: tradeSimulationApi,
  lfs: lfsApi,
};

export default api;
