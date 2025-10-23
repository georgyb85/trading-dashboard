import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StatusMessage,
  StatusSnapshotMessage,
  StatusStatsMessage,
  StatusTradeMessage,
  StatusOHLCVMessage,
  TradeData,
  OHLCVData,
  StatsData
} from '@/types/status';

interface UseStatusStreamOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxTradeHistory?: number;
  maxOHLCVHistory?: number;
}

export function useStatusStream(options: UseStatusStreamOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 5000,
    maxTradeHistory = 100,
    maxOHLCVHistory = 50
  } = options;

  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCVData[]>([]);
  const [lastPrices, setLastPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(autoConnect);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/status-ws`;

    console.log('Connecting to Status Stream WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Status Stream WebSocket connected');
      setConnected(true);
      setError(null);

      // Subscribe to status topic
      ws.send(JSON.stringify({
        action: 'subscribe',
        topic: 'status'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: StatusMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'snapshot':
            handleSnapshot(message as StatusSnapshotMessage);
            break;
          case 'stats':
            handleStats(message as StatusStatsMessage);
            break;
          case 'trade':
            handleTrade(message as StatusTradeMessage);
            break;
          case 'ohlcv':
            handleOHLCV(message as StatusOHLCVMessage);
            break;
        }
      } catch (err) {
        console.error('Error parsing Status Stream message:', err);
        setError('Failed to parse message');
      }
    };

    ws.onerror = (event) => {
      console.error('Status Stream WebSocket error:', event);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('Status Stream WebSocket disconnected');
      setConnected(false);
      wsRef.current = null;

      if (reconnect && shouldConnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Reconnecting to Status Stream...');
          connect();
        }, reconnectInterval);
      }
    };
  }, [reconnect, reconnectInterval]);

  const handleSnapshot = useCallback((message: StatusSnapshotMessage) => {
    if (message.stats) {
      setStats(message.stats);
      if (message.stats.last_prices) {
        setLastPrices(message.stats.last_prices);
      }
    }
    if (message.trades) {
      setTrades(message.trades.slice(-maxTradeHistory));
    }
    if (message.ohlcv) {
      setOhlcv(message.ohlcv.slice(-maxOHLCVHistory));
    }
  }, [maxTradeHistory, maxOHLCVHistory]);

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

    if (message.last_prices) {
      setLastPrices(message.last_prices);
    }
  }, []);

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

    // Update last price
    setLastPrices(prev => ({
      ...prev,
      [message.symbol]: message.price
    }));
  }, [maxTradeHistory]);

  const handleOHLCV = useCallback((message: StatusOHLCVMessage) => {
    const candle: OHLCVData = {
      exchange: message.exchange,
      symbol: message.symbol,
      timeframe: message.timeframe,
      timestamp: message.timestamp,
      timestamp_iso: message.timestamp_iso,
      open: message.open,
      high: message.high,
      low: message.low,
      close: message.close,
      volume: message.volume,
      trades: message.trades,
      vwap: message.vwap,
      text: message.text
    };

    setOhlcv(prev => {
      const newOHLCV = [...prev, candle];
      return newOHLCV.slice(-maxOHLCVHistory);
    });
  }, [maxOHLCVHistory]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    error,
    stats,
    trades,
    ohlcv,
    lastPrices,
    connect,
    disconnect
  };
}
