// API Client with retry logic and error handling

import { ApiResponse, ApiError } from '@/lib/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://45.85.147.236:33931';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize error messages for toast-friendly display
   */
  private normalizeError(error: any): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'CLIENT_ERROR',
      };
    }

    if (typeof error === 'string') {
      return {
        message: error,
        code: 'UNKNOWN_ERROR',
      };
    }

    if (error.message) {
      return {
        message: error.message,
        code: error.code || 'API_ERROR',
        details: error.details,
      };
    }

    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  /**
   * Core fetch method with retry logic
   */
  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Retry on 5xx errors
        if (response.status >= 500 && retries > 0) {
          await this.sleep(RETRY_DELAY);
          return this.fetchWithRetry<T>(endpoint, options, retries - 1);
        }

        throw {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          code: `HTTP_${response.status}`,
          details: errorData,
        };
      }

      const data = await response.json();

      return {
        data,
        success: true,
      };
    } catch (error: any) {
      // Retry on network errors
      if (retries > 0 && (error.name === 'TypeError' || error.code === 'ECONNREFUSED')) {
        await this.sleep(RETRY_DELAY);
        return this.fetchWithRetry<T>(endpoint, options, retries - 1);
      }

      return {
        error: this.normalizeError(error),
        success: false,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';

    return this.fetchWithRetry<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
