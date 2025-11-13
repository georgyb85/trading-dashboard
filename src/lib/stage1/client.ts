// Stage1 API Client

import { config } from '@/lib/config';
import type {
  Stage1DatasetSummary,
  Stage1RunSummary,
  Stage1RunDetail,
  Stage1ApiResponse,
  ValidateScriptRequest,
  ValidateScriptResponse,
  BuildIndicatorsRequest,
  BuildIndicatorsResponse,
  SimulateTradesRequest,
  SimulateTradesResponse,
  Stage1IndicatorResponse,
  Stage1DatasetManifest,
  Stage1IndexMapResponse,
} from './types';

class Stage1Client {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = config.stage1ApiBaseUrl, token: string = config.stage1ApiToken) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<Stage1ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add optional token header
    if (this.token) {
      headers['X-Stage1-Token'] = this.token;
    }

    try {
      if (config.isDev) {
        console.log('[Stage1 API]', options.method || 'GET', url);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (config.isDev) {
        console.log('[Stage1 API] Response:', data);
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (config.isDev) {
        console.error('[Stage1 API] Error:', errorMessage);
      }

      return {
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * List datasets
   */
  async listDatasets(limit = 100, offset = 0): Promise<Stage1ApiResponse<Stage1DatasetSummary[]>> {
    const response = await this.request<{ datasets: Stage1DatasetSummary[]; count: number }>(
      `/api/datasets?limit=${limit}&offset=${offset}`
    );

    if (response.success && response.data) {
      return {
        data: response.data.datasets,
        success: true,
      };
    }

    return response as any;
  }

  /**
   * List runs for a dataset
   */
  async listRuns(datasetId: string, limit = 200, offset = 0): Promise<Stage1ApiResponse<Stage1RunSummary[]>> {
    const response = await this.request<{ runs: Stage1RunSummary[]; count: number }>(
      `/api/datasets/${datasetId}/runs?limit=${limit}&offset=${offset}`
    );

    if (response.success && response.data) {
      return {
        data: response.data.runs,
        success: true,
      };
    }

    return response as any;
  }

  /**
   * Get run details with folds
   */
  async getRun(runId: string): Promise<Stage1ApiResponse<Stage1RunDetail>> {
    return this.request<Stage1RunDetail>(`/api/runs/${runId}`);
  }

  /**
   * Get run predictions (optional, for future trade-sim seeding)
   */
  async getRunPredictions(runId: string, format = 'json'): Promise<Stage1ApiResponse<any>> {
    return this.request<any>(`/api/runs/${runId}/predictions?format=${format}`);
  }

  /**
   * Fetch indicator rows for a dataset (ascending when desc=false)
   */
  async getDatasetIndicators(
    datasetId: string,
    { limit, desc, offset }: { limit?: number; desc?: boolean; offset?: number } = {}
  ): Promise<Stage1ApiResponse<Stage1IndicatorResponse>> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.append('limit', String(limit));
    if (typeof desc === 'boolean') params.append('desc', desc ? 'true' : 'false');
    if (typeof offset === 'number') params.append('offset', String(offset));
    const qs = params.toString();
    const path = qs ? `/api/datasets/${datasetId}/indicators?${qs}` : `/api/datasets/${datasetId}/indicators`;
    return this.request<Stage1IndicatorResponse>(path);
  }

  /**
   * Fetch dataset manifest (interval, lookback, bounds)
   */
  async getDatasetManifest(datasetId: string): Promise<Stage1ApiResponse<Stage1DatasetManifest>> {
    return this.request<Stage1DatasetManifest>(`/api/datasets/${datasetId}/manifest`);
  }

  /**
   * Fetch index→timestamp mapping without pulling full indicator rows
   */
  async getDatasetIndexMap(
    datasetId: string,
    { startIdx, endIdx, type }: { startIdx: number; endIdx: number; type?: 'indicator' | 'ohlcv' }
  ): Promise<Stage1ApiResponse<Stage1IndexMapResponse>> {
    const params = new URLSearchParams();
    params.append('start_idx', String(startIdx));
    params.append('end_idx', String(endIdx));
    if (type) {
      params.append('type', type);
    }
    return this.request<Stage1IndexMapResponse>(`/api/datasets/${datasetId}/index_map?${params.toString()}`);
  }

  /**
   * Validate indicator script
   */
  async validateIndicatorScript(script: string): Promise<Stage1ApiResponse<ValidateScriptResponse>> {
    return this.request<ValidateScriptResponse>('/api/indicators/validate', {
      method: 'POST',
      body: JSON.stringify({ script }),
    });
  }

  /**
   * Build indicators from script
   */
  async buildIndicators(request: BuildIndicatorsRequest): Promise<Stage1ApiResponse<BuildIndicatorsResponse>> {
    return this.request<BuildIndicatorsResponse>('/api/indicators/build', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Simulate trades for a run with given configuration
   */
  async simulateTrades(request: SimulateTradesRequest): Promise<Stage1ApiResponse<SimulateTradesResponse>> {
    return this.request<SimulateTradesResponse>('/api/trades/simulate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Export singleton instance
export const stage1Client = new Stage1Client();

// Export typed fetch helpers
export const listDatasets = (limit?: number, offset?: number) =>
  stage1Client.listDatasets(limit, offset);

export const listRuns = (datasetId: string, limit?: number, offset?: number) =>
  stage1Client.listRuns(datasetId, limit, offset);

export const getRun = (runId: string) =>
  stage1Client.getRun(runId);

export const getRunPredictions = (runId: string, format?: string) =>
  stage1Client.getRunPredictions(runId, format);

export const getDatasetIndicators = (
  datasetId: string,
  params?: { limit?: number; desc?: boolean; offset?: number }
) => stage1Client.getDatasetIndicators(datasetId, params);

export const getDatasetManifest = (datasetId: string) =>
  stage1Client.getDatasetManifest(datasetId);

export const getDatasetIndexMap = (
  datasetId: string,
  params: { startIdx: number; endIdx: number; type?: 'indicator' | 'ohlcv' }
) => stage1Client.getDatasetIndexMap(datasetId, params);

export const validateIndicatorScript = (script: string) =>
  stage1Client.validateIndicatorScript(script);

export const buildIndicators = (request: BuildIndicatorsRequest) =>
  stage1Client.buildIndicators(request);

export const simulateTrades = (request: SimulateTradesRequest) =>
  stage1Client.simulateTrades(request);
