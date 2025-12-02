import { config } from '@/lib/config';
import type { KrakenApiResponse, GoLiveRequest, GoLiveResponse, ActiveModelResponse } from './types';

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
}

export const krakenClient = new KrakenClient();
