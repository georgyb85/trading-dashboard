import { useState, useEffect, useCallback, useRef } from 'react';

// Indicator names in order (matches var.txt from the WebSocket API)
export const INDICATOR_NAMES = [
  'ADX_L',
  'AROON_DIFF_S',
  'BOL_WIDTH_M',
  'CMMA_S',
  'DTR_RSI_M',
  'PCO_10_20',
  'PV_FIT_M',
] as const;

export type IndicatorName = typeof INDICATOR_NAMES[number];

export interface IndicatorSnapshot {
  timestamp: number;
  values: number[];
  valid: boolean;
}

export interface OhlcvBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AtrData {
  timestamp: number;
  value: number;
  stopLossLevel: number;
  takeProfitLevel: number;
}

export interface PositionData {
  hasPosition: boolean;
  side?: 'long' | 'short';
  entryPrice?: number;
  entryTimestamp?: number;
  size?: number;
  unrealizedPnl?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PerformanceData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface TradingRules {
  positionSize: number;
  exitStrengthPct: number;
  honorSignalReversal: boolean;
  useSignalExit: boolean;
  stopLoss: {
    enabled: boolean;
    useATR: boolean;
    fixedPct: number;
    atrMultiplier: number;
    atrPeriod: number;
    cooldownBars: number;
  };
  takeProfit: {
    enabled: boolean;
    useATR: boolean;
    fixedPct: number;
    atrMultiplier: number;
    atrPeriod: number;
  };
  timeExit: {
    enabled: boolean;
    maxHoldingBars: number;
  };
}

interface UseMarketDataStreamOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  maxHistorySize?: number;
}

export function useMarketDataStream(options: UseMarketDataStreamOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 1000,
    maxReconnectInterval = 30000,
    maxHistorySize = 1000,
  } = options;

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [tradingRules, setTradingRules] = useState<TradingRules | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot[]>([]);
  const [ohlcv, setOhlcv] = useState<OhlcvBar[]>([]);
  const [atr, setAtr] = useState<AtrData | null>(null);
  const [position, setPosition] = useState<PositionData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(autoConnect);
  const reconnectAttemptsRef = useRef(0);
  // Track if we've received snapshot data - don't request again on reconnect
  const hasSnapshotRef = useRef(false);

  // Handle topic-specific data (both initial snapshot and updates)
  const handleTopicData = useCallback(
    (topic: string, data: any, isInitial: boolean) => {
      switch (topic) {
        case 'indicators':
          if (isInitial && data.snapshots) {
            // Filter to only valid snapshots
            const validSnapshots = data.snapshots.filter((s: IndicatorSnapshot) => s.valid !== false);
            console.log(
              `[MarketDataStream] Received ${data.snapshots.length} indicator snapshots (${validSnapshots.length} valid)`
            );
            setIndicators(validSnapshots.slice(-maxHistorySize));
          } else if (!isInitial) {
            // Only append if the snapshot is valid
            if (data.valid !== false) {
              setIndicators((prev) => {
                // Deduplicate by timestamp
                const exists = prev.some(s => s.timestamp === data.timestamp);
                if (exists) {
                  return prev;
                }
                console.log('[MarketDataStream] New indicator update:', new Date(data.timestamp).toISOString());
                return [...prev.slice(-(maxHistorySize - 1)), data];
              });
            }
          }
          break;

        case 'ohlcv':
          if (isInitial && data.bars) {
            console.log(`[MarketDataStream] Received ${data.bars.length} historical OHLCV bars`);
            setOhlcv(data.bars.slice(-maxHistorySize));
          } else if (!isInitial) {
            setOhlcv((prev) => {
              // Deduplicate by timestamp
              const exists = prev.some(bar => bar.timestamp === data.timestamp);
              if (exists) {
                return prev;
              }
              console.log('[MarketDataStream] New OHLCV bar:', new Date(data.timestamp).toISOString());
              return [...prev.slice(-(maxHistorySize - 1)), data];
            });
          }
          break;

        case 'atr':
          if (isInitial && data.current) {
            setAtr(data.current);
          } else if (!isInitial) {
            setAtr(data);
          }
          break;

        case 'position':
          setPosition(data);
          break;

        case 'performance':
          setPerformance(data);
          break;
      }
    },
    [maxHistorySize]
  );

  // Handle incoming messages
  const handleMessage = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case 'initial_data':
          if (msg.clientId) {
            // Welcome message
            console.log('[MarketDataStream] Welcome message received, clientId:', msg.clientId);
            setClientId(msg.clientId);
            setTradingRules(msg.tradingRules);

            // Auto-subscribe to topics (lightweight, no data sent)
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'subscribe',
                  topics: ['indicators', 'ohlcv', 'atr', 'position', 'performance'],
                })
              );

              // Only request snapshot on first connection, not on reconnects
              if (!hasSnapshotRef.current) {
                console.log('[MarketDataStream] Requesting initial snapshot...');
                wsRef.current.send(
                  JSON.stringify({
                    type: 'snapshot',
                    topics: ['indicators', 'ohlcv', 'atr', 'position', 'performance'],
                  })
                );
              } else {
                console.log('[MarketDataStream] Reconnected - using cached data, not requesting snapshot');
              }
            }
          } else if (msg.topic) {
            // Snapshot data for a topic
            handleTopicData(msg.topic, msg.data, true);
          }
          break;

        case 'update':
          handleTopicData(msg.topic, msg.data, false);
          break;

        case 'subscribed':
          console.log('[MarketDataStream] Subscribed to:', msg.topics);
          setSubscribedTopics(msg.topics);
          break;

        case 'snapshot_complete':
          console.log('[MarketDataStream] Snapshot complete for:', msg.topics);
          hasSnapshotRef.current = true;
          break;

        case 'unsubscribed':
          console.log('[MarketDataStream] Unsubscribed from:', msg.topics);
          setSubscribedTopics((prev) => prev.filter((t) => !msg.topics.includes(t)));
          break;

        case 'error':
          const errorMsg = msg.message || msg.error || JSON.stringify(msg);
          console.error('[MarketDataStream] Server error:', errorMsg);
          setError(errorMsg);
          break;

        case 'pong':
        case 'heartbeat':
          // Server heartbeat/pong - just acknowledge, no response needed
          break;

        default:
          console.warn('[MarketDataStream] Unknown message type:', msg.type);
      }
    },
    [handleTopicData]
  );

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Use nginx-proxied WebSocket endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/market-data-ws`;

    console.log('[MarketDataStream] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[MarketDataStream] WebSocket connected');
      setConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Start sending application-level pings every 15 seconds (required for vast.ai proxy)
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (err) {
        console.error('[MarketDataStream] Error parsing message:', err);
        setError('Failed to parse message');
      }
    };

    ws.onerror = (event) => {
      console.error('[MarketDataStream] WebSocket error:', event);
      // Only set error if this is a fresh connection attempt (no prior data)
      setIndicators((prev) => {
        if (prev.length === 0) {
          setError('Market data service unavailable');
        }
        return prev;
      });
    };

    ws.onclose = (event) => {
      console.log('[MarketDataStream] WebSocket disconnected, code:', event.code);
      setConnected(false);
      wsRef.current = null;

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      if (reconnect && shouldConnectRef.current) {
        // Reconnect with exponential backoff
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
          maxReconnectInterval
        );
        console.log(`[MarketDataStream] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };
  }, [reconnect, reconnectInterval, maxReconnectInterval, handleMessage]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const subscribe = useCallback((topics: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', topics }));
    }
  }, []);

  const unsubscribe = useCallback((topics: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', topics }));
    }
  }, []);

  // Request fresh snapshot (useful if data is stale after long disconnect)
  const requestSnapshot = useCallback((topics: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[MarketDataStream] Manually requesting snapshot for:', topics);
      wsRef.current.send(JSON.stringify({ type: 'snapshot', topics }));
    }
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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  // Computed values
  const latestIndicator = indicators.length > 0 ? indicators[indicators.length - 1] : null;
  const latestOhlcv = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1] : null;

  return {
    connected,
    clientId,
    tradingRules,
    indicators,
    ohlcv,
    atr,
    position,
    performance,
    error,
    subscribedTopics,
    latestIndicator,
    latestOhlcv,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    requestSnapshot,
  };
}
