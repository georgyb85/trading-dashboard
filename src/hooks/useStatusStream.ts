import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StatusMessage,
  StatusStatsMessage,
  StatusTradeMessage,
  TradeData,
  StatsData
} from '@/types/status';

// Helper to convert array format [{symbol, price}] to Record<string, number>
function convertLastPrices(prices: any): Record<string, number> {
  if (!prices) return {};

  // If it's already an object (Record format), return as-is
  if (!Array.isArray(prices) && typeof prices === 'object') {
    return prices;
  }

  // Convert array format to object
  if (Array.isArray(prices)) {
    const result: Record<string, number> = {};
    for (const item of prices) {
      if (item && item.symbol && typeof item.price === 'number') {
        result[item.symbol] = item.price;
      }
    }
    return result;
  }

  return {};
}

interface UseStatusStreamOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxTradeHistory?: number;
}

export function useStatusStream(options: UseStatusStreamOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 5000,
    maxTradeHistory = 100
  } = options;

  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [lastPrices, setLastPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(autoConnect);

  // Define all handlers BEFORE connect so they can be referenced
  const handleSnapshot = useCallback((message: any) => {
    console.log('[StatusStream] Snapshot received');

    if (message.stats) {
      // Build stats object from backend format
      const s = message.stats;
      const statsData: StatsData = {
        timestamp: s.timestamp,
        text: s.text,
        last_prices: s.lastPrices || s.last_prices,
        message_counts: s.counts || s.message_counts,
        message_rates: s.rates || s.message_rates,
        thread_statuses: s.threads || s.thread_statuses
      };
      setStats(statsData);

      // Backend sends lastPrices as array [{symbol, price}], convert to Record and MERGE
      const prices = s.lastPrices || s.last_prices;
      if (prices) {
        const converted = convertLastPrices(prices);
        if (Object.keys(converted).length > 0) {
          console.log('[StatusStream] Snapshot prices:', Object.keys(converted).length, 'symbols');
          setLastPrices(prev => ({ ...prev, ...converted }));
        }
      }
    }
    if (message.trades && Array.isArray(message.trades) && message.trades.length > 0) {
      console.log('[StatusStream] Snapshot trades:', message.trades.length);
      setTrades(prev => {
        const newTrades = [...prev, ...message.trades];
        return newTrades.slice(-maxTradeHistory);
      });
    }
  }, [maxTradeHistory]);

  const handleStats = useCallback((message: StatusStatsMessage) => {
    const statsData: StatsData = {
      timestamp: message.timestamp,
      text: message.text,
      last_prices: message.last_prices,
      message_counts: message.message_counts,
      message_rates: message.message_rates,
      thread_statuses: message.thread_statuses
    };
    setStats(statsData);

    // Backend may send lastPrices as array, convert to Record and MERGE
    const prices = (message as any).lastPrices || message.last_prices;
    if (prices) {
      const converted = convertLastPrices(prices);
      if (Object.keys(converted).length > 0) {
        setLastPrices(prev => ({ ...prev, ...converted }));
      }
    }
  }, []);

  // Handle combined 'update' messages from backend
  const handleUpdate = useCallback((message: any) => {
    // Extract stats - backend sends camelCase (lastPrices as array)
    if (message.stats) {
      const s = message.stats;
      const statsData: StatsData = {
        timestamp: s.timestamp,
        text: s.text,
        last_prices: s.lastPrices || s.last_prices,
        message_counts: s.counts || s.message_counts,
        message_rates: s.rates || s.message_rates,
        thread_statuses: s.threads || s.thread_statuses
      };
      setStats(statsData);

      // Update lastPrices - backend sends as array [{symbol, price}], convert and MERGE
      const prices = s.lastPrices || s.last_prices;
      if (prices) {
        const converted = convertLastPrices(prices);
        if (Object.keys(converted).length > 0) {
          setLastPrices(prev => ({ ...prev, ...converted }));
        }
      }
    }

    // Handle lastPrices directly on message (not nested in stats)
    if (message.lastPrices || message.last_prices) {
      const prices = message.lastPrices || message.last_prices;
      const converted = convertLastPrices(prices);
      if (Object.keys(converted).length > 0) {
        setLastPrices(prev => ({ ...prev, ...converted }));
      }
    }

    // Handle trades array in update - only log if we have data
    if (message.trades && Array.isArray(message.trades) && message.trades.length > 0) {
      console.log('[StatusStream] Update trades:', message.trades.length);
      setTrades(prev => {
        const newTrades = [...prev, ...message.trades];
        return newTrades.slice(-maxTradeHistory);
      });
    }
  }, [maxTradeHistory]);

  const handleTrade = useCallback((message: StatusTradeMessage) => {
    const trade: TradeData = {
      symbol: message.symbol,
      side: message.side,
      price: message.price,
      volume: message.volume,
      timestamp: message.timestamp,
      timestamp_iso: message.timestamp_iso,
      message_counts: message.message_counts
    };

    setTrades(prev => {
      const newTrades = [...prev, trade];
      return newTrades.slice(-maxTradeHistory);
    });

    // Update last price - MERGE with existing
    setLastPrices(prev => ({
      ...prev,
      [message.symbol]: message.price
    }));
  }, [maxTradeHistory]);

  // Now define connect AFTER all handlers
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/status-ws`;

    console.log('[StatusStream] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[StatusStream] Connected');
      setConnected(true);
      setError(null);

      // Subscribe to status topic
      ws.send(JSON.stringify({
        action: 'subscribe',
        topic: 'status'
      }));

      // Start sending pings every 15 seconds to keep connection alive
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const message: StatusMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'snapshot':
            handleSnapshot(message);
            break;
          case 'stats':
            handleStats(message as StatusStatsMessage);
            break;
          case 'trade':
            handleTrade(message as StatusTradeMessage);
            break;
          case 'update':
            handleUpdate(message);
            break;
          case 'pong':
            // Response to our ping, ignore
            break;
          default:
            // Only log truly unknown message types
            if (message.type) {
              console.log('[StatusStream] Unknown message type:', message.type);
            }
        }
      } catch (err) {
        console.error('[StatusStream] Error parsing message:', err);
        setError('Failed to parse message');
      }
    };

    ws.onerror = (event) => {
      console.error('[StatusStream] WebSocket error:', event);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('[StatusStream] Disconnected');
      setConnected(false);
      wsRef.current = null;

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (reconnect && shouldConnectRef.current) {
        // Reconnect after brief delay
        const delay = 500;
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[StatusStream] Reconnecting...');
          connect();
        }, delay);
      }
    };
  }, [reconnect, handleSnapshot, handleStats, handleUpdate, handleTrade]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Connect once on mount, disconnect on unmount
  useEffect(() => {
    if (autoConnect) {
      shouldConnectRef.current = true;
      connect();
    }

    return () => {
      // Cleanup on unmount
      shouldConnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  return {
    connected,
    error,
    stats,
    trades,
    lastPrices,
    connect,
    disconnect
  };
}
