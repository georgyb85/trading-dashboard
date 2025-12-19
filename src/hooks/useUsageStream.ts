import { useState, useEffect, useCallback, useRef } from 'react';
import type { UsageUpdate, SystemInfo, UsageMessage } from '@/lib/kraken/types';
import { config } from '@/lib/config';
import { joinUrl } from '@/lib/url';

const MAX_RECONNECT_DELAY = 30_000; // Max 30s between retries
const INITIAL_RECONNECT_DELAY = 2_000; // Start at 2s
const MAX_RETRIES = 10; // Cap retries to avoid infinite loop

interface UseUsageStreamResult {
  usage: UsageUpdate | null;
  systemInfo: SystemInfo | null;
  connected: boolean;
  error: string | null;
  retryCount: number;
}

export const useUsageStream = (): UseUsageStreamResult => {
  const [usage, setUsage] = useState<UsageUpdate | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    // Skip if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Check if we've exceeded max retries
    if (retryCountRef.current >= MAX_RETRIES) {
      setError(`Connection failed after ${MAX_RETRIES} attempts. Refresh to retry.`);
      return;
    }

    // Use proxied path for Kraken trader (nginx/caddy forwards /api/usage to Kraken trader)
    const wsUrl = joinUrl(config.krakenWsBaseUrl, '/api/usage');
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setError(`Failed to create WebSocket: ${e instanceof Error ? e.message : 'Unknown error'}`);
      return;
    }

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      retryCountRef.current = 0;
      setRetryCount(0);
    };

    ws.onmessage = (event) => {
      try {
        const msg: UsageMessage = JSON.parse(event.data);
        if (msg.type === 'usage_update') {
          setUsage(msg);
        } else if (msg.type === 'system_info') {
          setSystemInfo(msg);
        }
      } catch (e) {
        // Silent parse error - don't spam console
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null; // Clear ref immediately on close
      retryCountRef.current++;
      setRetryCount(retryCountRef.current);

      if (retryCountRef.current < MAX_RETRIES) {
        // Exponential backoff with jitter
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(1.5, retryCountRef.current) + Math.random() * 1000,
          MAX_RECONNECT_DELAY
        );
        setError(`Disconnected. Retry ${retryCountRef.current}/${MAX_RETRIES} in ${(delay / 1000).toFixed(0)}s...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      } else {
        setError(`Connection failed after ${MAX_RETRIES} attempts. Refresh to retry.`);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { usage, systemInfo, connected, error, retryCount };
};
