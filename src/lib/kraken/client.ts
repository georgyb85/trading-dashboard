import { config } from '@/lib/config';
import type {
  KrakenApiResponse,
  GoLiveRequest,
  GoLiveResponse,
  ActiveModelResponse,
  LiveModelSummary,
  LiveModelMetricsResponse,
  AvailableFeaturesResponse,
  ExecutorConfig,
  HealthResponse,
  RecoveryResetResponse,
} from './types';

class KrakenClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.krakenRestBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<KrakenApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      const resp = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        try {
          const parsed = JSON.parse(text) as { error?: string; message?: string };
          throw new Error(parsed.message || parsed.error || text || `HTTP ${resp.status}`);
        } catch {
          throw new Error(text || `HTTP ${resp.status}`);
        }
      }
      const json = (await resp.json()) as T;
      return { success: true, data: json };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return { success: false, error: message };
    }
  }

  async goLive(payload: GoLiveRequest): Promise<KrakenApiResponse<GoLiveResponse>> {
    return this.request<GoLiveResponse>('/api/live/go', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getActiveModel(): Promise<KrakenApiResponse<ActiveModelResponse>> {
    return this.request<ActiveModelResponse>('/api/live/active_model');
  }

  async listModels(): Promise<KrakenApiResponse<{ models: LiveModelSummary[] }>> {
    return this.request<{ models: LiveModelSummary[] }>('/api/live/models');
  }

  async activateModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/live/models/${modelId}/activate`, { method: 'POST' });
  }

  async deactivateModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/live/models/${modelId}/deactivate`, { method: 'POST' });
  }

  async retrainModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean; train_result?: unknown }>> {
    return this.request<{ success: boolean; train_result?: unknown }>(`/api/live/models/${modelId}/retrain`, { method: 'POST' });
  }

  async getMetrics(modelId: string): Promise<KrakenApiResponse<LiveModelMetricsResponse>> {
    return this.request<LiveModelMetricsResponse>(`/api/live/models/${modelId}/metrics`);
  }

  async deleteModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/live/models/${modelId}`, { method: 'DELETE' });
  }

  async updateThresholds(modelId: string, longThreshold: number, shortThreshold: number): Promise<KrakenApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/live/models/${modelId}/thresholds`, {
      method: 'POST',
      body: JSON.stringify({ long_threshold: longThreshold, short_threshold: shortThreshold }),
    });
  }

  async getPredictions(modelId: string, limit = 50): Promise<KrakenApiResponse<{ model_id: string; predictions: Array<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string; model_id?: string; actual?: number; matched?: boolean }> }>> {
    const params = new URLSearchParams({ model_id: modelId, limit: String(limit) });
    return this.request<{ model_id: string; predictions: Array<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string; model_id?: string; actual?: number; matched?: boolean }> }>(`/api/live/predictions?${params.toString()}`);
  }

  async getAvailableFeatures(timeframe?: string): Promise<KrakenApiResponse<AvailableFeaturesResponse>> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<AvailableFeaturesResponse>(`/api/live/available-features${params}`);
  }

  // Model-Executor Decoupling API

  /**
   * Deploy a model for predictions only (no trading)
   */
  async deployModel(runId: string, streamId?: string): Promise<KrakenApiResponse<{ model_id: string; stream_id: string; mode: string }>> {
    return this.request<{ model_id: string; stream_id: string; mode: string }>('/api/live/models/deploy', {
      method: 'POST',
      body: JSON.stringify({ run_id: runId, stream_id: streamId }),
    });
  }

  /**
   * Attach an executor to a deployed model
   */
  async attachExecutor(modelId: string, config: ExecutorConfig): Promise<KrakenApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/api/live/models/${modelId}/executor`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Update an existing executor's config
   */
  async updateExecutor(modelId: string, config: ExecutorConfig): Promise<KrakenApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/api/live/models/${modelId}/executor`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * Detach executor from a model (model continues predicting)
   */
  async detachExecutor(modelId: string): Promise<KrakenApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/api/live/models/${modelId}/executor`, {
      method: 'DELETE',
    });
  }

  /**
   * Undeploy a model entirely
   */
  async undeployModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(`/api/live/models/${modelId}/undeploy`, {
      method: 'POST',
    });
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<KrakenApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/api/live/health');
  }

  /**
   * Operator action: force reconciliation + Stage1 desired-state reload.
   */
  async recoveryReset(): Promise<KrakenApiResponse<RecoveryResetResponse>> {
    return this.request<RecoveryResetResponse>('/api/live/recovery/reset', { method: 'POST' });
  }
}

export const krakenClient = new KrakenClient();
