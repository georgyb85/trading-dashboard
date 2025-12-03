import { config } from '@/lib/config';
import type {
  KrakenApiResponse,
  GoLiveRequest,
  GoLiveResponse,
  ActiveModelResponse,
  LiveModelSummary,
  LiveModelMetricsResponse,
  AvailableFeaturesResponse,
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
        throw new Error(text || `HTTP ${resp.status}`);
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

  async retrainModel(modelId: string): Promise<KrakenApiResponse<{ success: boolean; train_result?: any }>> {
    return this.request<{ success: boolean; train_result?: any }>(`/api/live/models/${modelId}/retrain`, { method: 'POST' });
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

  async getPredictions(modelId: string, limit = 50): Promise<KrakenApiResponse<{ model_id: string; predictions: Array<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string }> }>> {
    const params = new URLSearchParams({ model_id: modelId, limit: String(limit) });
    return this.request<{ model_id: string; predictions: Array<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string }> }>(`/api/live/predictions?${params.toString()}`);
  }

  async getAvailableFeatures(timeframe?: string): Promise<KrakenApiResponse<AvailableFeaturesResponse>> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<AvailableFeaturesResponse>(`/api/live/available-features${params}`);
  }
}

export const krakenClient = new KrakenClient();
