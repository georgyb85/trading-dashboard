import { config } from '@/lib/config';
import type {
  XGBoostServerMessage,
  XGBoostTrainResult,
  XGBoostPredictResponse,
} from '@/lib/types/xgboost';

type PendingRequest =
  | {
      type: 'train';
      resolve: (result: XGBoostTrainResult) => void;
      reject: (error: Error) => void;
    }
  | {
      type: 'predict';
      resolve: (result: XGBoostPredictResponse['result']) => void;
      reject: (error: Error) => void;
    };

const DEFAULT_TIMEOUT_MS = 120_000;

export interface TrainPayload {
  dataset: {
    dataset_id: string;
    feature_columns: string[];
    target_column: string;
    train: { start_timestamp: number; end_timestamp: number };
    validation: { start_timestamp: number; end_timestamp: number };
    test?: { start_timestamp: number; end_timestamp: number };
  };
  config: Record<string, unknown>;
}

export class XGBoostClient {
  private url: string;
  private ws: WebSocket | null = null;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private connectionReject: ((reason?: unknown) => void) | null = null;
  private sessionId: string | null = null;
  private pending = new Map<string, PendingRequest>();
  private pendingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(url: string = config.krakenXgboostWsUrl) {
    this.url = url;
  }

  async train(payload: TrainPayload): Promise<XGBoostTrainResult> {
    await this.ensureConnection();
    const requestId = this.generateRequestId();
    const message = {
      type: 'train',
      request_id: requestId,
      dataset: payload.dataset,
      config: payload.config,
    };

    const promise = new Promise<XGBoostTrainResult>((resolve, reject) => {
      this.pending.set(requestId, { type: 'train', resolve, reject });
      this.setTimeoutForRequest(requestId);
    });

    this.send(message);
    return promise;
  }

  async predict(features: number[]): Promise<XGBoostPredictResponse['result']> {
    await this.ensureConnection();
    const requestId = this.generateRequestId();
    const message = {
      type: 'predict_live',
      request_id: requestId,
      features,
    };

    const promise = new Promise<XGBoostPredictResponse['result']>((resolve, reject) => {
      this.pending.set(requestId, { type: 'predict', resolve, reject });
      this.setTimeoutForRequest(requestId);
    });

    this.send(message);
    return promise;
  }

  close() {
    this.pending.forEach(({ reject }, requestId) => {
      reject(new Error('Connection closed'));
      this.clearTimeoutForRequest(requestId);
    });
    this.pending.clear();
    if (this.ws) {
      this.ws.close();
    }
    this.ws = null;
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
  }

  private ensureConnection(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
      this.openWebSocket();
    });

    return this.connectionPromise;
  }

  private openWebSocket() {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
      // Wait for session_init before resolving
    });

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });

    this.ws.addEventListener('error', (event) => {
      console.error('[XGBoostClient] WebSocket error', event);
    });

    this.ws.addEventListener('close', () => {
      this.rejectAllPending(new Error('Connection closed'));
      if (this.connectionReject) {
        this.connectionReject(new Error('Connection closed'));
      }
      this.connectionPromise = null;
      this.connectionResolve = null;
      this.connectionReject = null;
      this.ws = null;
    });
  }

  private handleMessage(raw: string) {
    let message: XGBoostServerMessage;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      console.error('[XGBoostClient] Failed to parse message', error);
      return;
    }

    switch (message.type) {
      case 'session_init': {
        this.sessionId = message.session_id;
        if (this.connectionResolve) {
          this.connectionResolve();
          this.connectionResolve = null;
          this.connectionReject = null;
        }
        break;
      }
      case 'reconnect_response': {
        if (!message.success) {
          console.warn('[XGBoostClient] Reconnect rejected');
        }
        break;
      }
      case 'train_response': {
        const pending = this.pending.get(message.request_id);
        if (pending && pending.type === 'train') {
          if (message.success) {
            pending.resolve(message.result);
          } else {
            pending.reject(new Error('Training failed'));
          }
          this.pending.delete(message.request_id);
          this.clearTimeoutForRequest(message.request_id);
        }
        break;
      }
      case 'predict_response': {
        const pending = this.pending.get(message.request_id);
        if (pending && pending.type === 'predict') {
          if (message.success) {
            pending.resolve(message.result);
          } else {
            pending.reject(new Error('Prediction failed'));
          }
          this.pending.delete(message.request_id);
          this.clearTimeoutForRequest(message.request_id);
        }
        break;
      }
      case 'error': {
        const requestId = message.request_id;
        if (requestId && this.pending.has(requestId)) {
          const pending = this.pending.get(requestId)!;
          pending.reject(new Error(message.message || message.error || 'Server error'));
          this.pending.delete(requestId);
          this.clearTimeoutForRequest(requestId);
        } else {
          console.error('[XGBoostClient] Server error:', message.error, message.message);
        }
        break;
      }
      default:
        // Ignore other message types for now
        break;
    }
  }

  private send(payload: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open');
    }
    this.ws.send(JSON.stringify(payload));
  }

  private rejectAllPending(error: Error) {
    this.pending.forEach(({ reject }, requestId) => {
      reject(error);
      this.clearTimeoutForRequest(requestId);
    });
    this.pending.clear();
  }

  private generateRequestId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }

  private setTimeoutForRequest(requestId: string) {
    const timeout = setTimeout(() => {
      const pending = this.pending.get(requestId);
      if (pending) {
        pending.reject(new Error('Request timed out'));
        this.pending.delete(requestId);
      }
    }, DEFAULT_TIMEOUT_MS);
    this.pendingTimeouts.set(requestId, timeout);
  }

  private clearTimeoutForRequest(requestId: string) {
    const timeout = this.pendingTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(requestId);
    }
  }
}

export const xgboostClient = new XGBoostClient();

