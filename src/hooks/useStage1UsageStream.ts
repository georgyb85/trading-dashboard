import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '@/lib/config';
import type { UsageUpdate, SystemInfo, UsageMessage } from '@/lib/kraken/types';

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 2_000;
const MAX_RETRIES = 10;

interface UseStage1UsageStreamResult {
  usage: UsageUpdate | null;
  systemInfo: SystemInfo | null;
  connected: boolean;
  error: string | null;
  retryCount: number;
}

/**
 * Hook to connect to Stage1 server's /usage WebSocket endpoint.
 * Stage1 provides CPU/RAM metrics but no GPU (no GPU on Stage1 server).
 * Message rates are not provided by Stage1.
 */
export const useStage1UsageStream = (): UseStage1UsageStreamResult => {
  const [usage, setUsage] = useState<UsageUpdate | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const connectionIdRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      setError(`Stage1 connection failed after ${MAX_RETRIES} attempts. Refresh to retry.`);
      return;
    }

    const connectionId = ++connectionIdRef.current;

    // Stage1 API base URL - convert http(s) to ws(s)
    const baseUrl = config.stage1ApiBaseUrl;
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = baseUrl.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${host}/usage`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setError(`Failed to create Stage1 WebSocket: ${e instanceof Error ? e.message : 'Unknown error'}`);
      return;
    }

    ws.onopen = () => {
      if (connectionId !== connectionIdRef.current) return;
      setConnected(true);
      setError(null);
      retryCountRef.current = 0;
      setRetryCount(0);
    };

    ws.onmessage = (event) => {
      if (connectionId !== connectionIdRef.current) return;
      try {
        const msg: UsageMessage = JSON.parse(event.data);
        setConnected(true);
        setError(null);
        if (msg.type === 'usage_update') {
          setUsage(msg);
        } else if (msg.type === 'system_info') {
          setSystemInfo(msg);
        }
      } catch (e) {
        // Silent parse error
      }
    };

    ws.onerror = () => {
      if (connectionId !== connectionIdRef.current) return;
      setError('Stage1 WebSocket connection error');
    };

    ws.onclose = () => {
      if (connectionId !== connectionIdRef.current) return;
      setConnected(false);
      wsRef.current = null;
      retryCountRef.current++;
      setRetryCount(retryCountRef.current);

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(1.5, retryCountRef.current) + Math.random() * 1000,
          MAX_RECONNECT_DELAY
        );
        setError(`Stage1 disconnected. Retry ${retryCountRef.current}/${MAX_RETRIES} in ${(delay / 1000).toFixed(0)}s...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      } else {
        setError(`Stage1 connection failed after ${MAX_RETRIES} attempts. Refresh to retry.`);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      connectionIdRef.current++;
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
