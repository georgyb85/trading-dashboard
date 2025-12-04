import { useState, useEffect, useCallback, useRef } from 'react';

export interface IndicatorSnapshot {
  timestamp: number;
  values: number[];
  valid: boolean;
  featureNames?: string[];
  featureHash?: string;
  streamId?: string;
}

export interface OhlcvBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;        // Volume Weighted Average Price
  tradeCount?: number;  // Number of trades in bar
  synthetic?: boolean;
  streamId: string;  // e.g. "btcusdt_1h" - required for deduplication
  symbol?: string;   // Display-friendly symbol (derived from streamId)
  startTimestamp?: number;
  finalized?: boolean;
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
  // V3 additional fields
  mse?: number;
  mae?: number;
  r2?: number;
  samples?: number;
  missed?: number;
  lastUpdate?: number;
  modelId?: string;
  streamId?: string;
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

export interface PredictionData {
  ts: number;
  modelId: string;
  streamId: string;
  prediction: number;
  longThreshold: number;
  shortThreshold: number;
  signal: 'long' | 'short' | 'flat';
}

export interface TargetData {
  originTs: number;
  maturedAtTs: number;
  value: number;
  streamId: string;
  targetName: string;
  horizonBars?: number;
}

export interface PerformanceSnapshot {
  modelId: string;
  streamId: string;
  mae?: number;
  directionalAccuracy?: number;
  sampleCount?: number;
  evaluatedAtTs?: number;
}

export interface StreamHealth {
  streamId: string;
  lastBarTs: number;
  lastIndicatorTs: number;
  ohlcvBufferSize: number;
  indicatorBufferSize: number;
  featureCount: number;
  registeredTargets: number;
  featureHash: number;
  stale: boolean;
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
  const [indicatorNames, setIndicatorNames] = useState<string[]>([]);
  const [ohlcv, setOhlcv] = useState<OhlcvBar[]>([]);
  const [atr, setAtr] = useState<AtrData | null>(null);
  const [position, setPosition] = useState<PositionData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [health, setHealth] = useState<StreamHealth[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const shouldConnectRef = useRef(autoConnect);
  const reconnectAttemptsRef = useRef(0);

  // Handle V3 unified /ws/live messages
  const handleV3Message = useCallback(
    (msg: any) => {
      // V3 sends topic-based messages directly
      switch (msg.topic) {
        case 'bar':
        case 'timeframe_bar': {
          const streamId = msg.stream_id ?? msg.streamId ?? 'unknown';
          // Derive symbol from streamId (e.g. "btcusdt_1h" -> "BTCUSDT")
          const symbol = streamId.split('_')[0]?.toUpperCase() || streamId;
          const bar: OhlcvBar = {
            timestamp: msg.bar_end_ts ?? msg.barEndTs ?? msg.end_ts ?? msg.ts ?? Date.now(),
            startTimestamp: msg.bar_start_ts ?? msg.start_ts,
            open: msg.open ?? msg.open_price,
            high: msg.high,
            low: msg.low,
            close: msg.close ?? msg.close_price,
            volume: msg.volume ?? 0,
            vwap: msg.vwap,
            tradeCount: msg.trade_count ?? msg.tradeCount,
            synthetic: msg.synthetic,
            finalized: msg.finalized,
            streamId,
            symbol,
          };
          setOhlcv((prev) => {
            // Find existing bar with same streamId + timestamp
            const existingIdx = prev.findIndex((b) => b.streamId === bar.streamId && b.timestamp === bar.timestamp);
            if (existingIdx >= 0) {
              // Update existing bar (e.g., when bar finalizes with VWAP)
              const updated = [...prev];
              updated[existingIdx] = bar;
              return updated;
            }
            console.log('[MarketDataStream] New bar:', symbol, new Date(bar.timestamp).toISOString());
            return [...prev.slice(-(maxHistorySize - 1)), bar];
          });
          return;
        }

        case 'indicators':
          {
            const names = msg.names && Array.isArray(msg.names)
              ? msg.names
              : msg.indicators
              ? Object.keys(msg.indicators)
              : [];
            const values = names.map((name: string) => msg.indicators?.[name]);
            const ts = msg.bar_end_ts ?? msg.ts ?? msg.barEndTs ?? Date.now();
            const indicatorSnapshot: IndicatorSnapshot = {
              timestamp: ts,
              values,
              valid: true,
              featureNames: names,
              featureHash: msg.feature_hash ?? msg.featureHash,
              streamId: msg.stream_id ?? msg.streamId,
            };
            setIndicators((prev) => {
              const exists = prev.some((s) => s.timestamp === indicatorSnapshot.timestamp);
              if (exists) {
                return prev;
              }
              console.log('[MarketDataStream] New indicators:', new Date(indicatorSnapshot.timestamp).toISOString());
              return [...prev.slice(-(maxHistorySize - 1)), indicatorSnapshot];
            });
            if (names.length > 0) {
              setIndicatorNames((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(names)) {
                  return names;
                }
                return prev;
              });
            }
          }
          return;

        case 'prediction': {
          const ts = msg.bar_end_ts ?? msg.ts ?? msg.barEndTs ?? Date.now();
          const predictionValue = msg.prediction ?? 0;
          const longThreshold = msg.long_threshold ?? msg.longThreshold ?? 0;
          const shortThreshold = msg.short_threshold ?? msg.shortThreshold ?? 0;
          const signal: PredictionData['signal'] =
            predictionValue > longThreshold ? 'long' : predictionValue < shortThreshold ? 'short' : 'flat';

          const pred: PredictionData = {
            ts,
            modelId: msg.model_id ?? msg.modelId ?? 'unknown',
            streamId: msg.stream_id ?? msg.streamId ?? 'unknown',
            prediction: predictionValue,
            longThreshold,
            shortThreshold,
            signal,
          };

          setPredictions((prev) => {
            const filtered = prev.filter((p) => !(p.modelId === pred.modelId && p.ts === pred.ts));
            return [...filtered, pred].sort((a, b) => b.ts - a.ts).slice(0, maxHistorySize);
          });
          return;
        }

        case 'target_matured': {
          const target: TargetData = {
            originTs: msg.origin_bar_ts ?? msg.origin_ts ?? msg.ts ?? Date.now(),
            maturedAtTs: msg.matured_at_ts ?? msg.matured_ts ?? Date.now(),
            value: msg.value,
            streamId: msg.stream_id ?? msg.streamId ?? 'unknown',
            targetName: msg.target_name ?? msg.target ?? 'unknown',
            horizonBars: msg.horizon_bars,
          };
          setTargets((prev) => {
            const filtered = prev.filter((t) => !(t.originTs === target.originTs && t.targetName === target.targetName && t.streamId === target.streamId));
            return [...filtered, target].sort((a, b) => b.originTs - a.originTs).slice(0, maxHistorySize);
          });
          return;
        }

        case 'performance': {
          const perf: PerformanceSnapshot = {
            modelId: msg.model_id ?? msg.modelId ?? 'unknown',
            streamId: msg.stream_id ?? msg.streamId ?? 'unknown',
            mae: msg.mae,
            directionalAccuracy: msg.directional_accuracy,
            sampleCount: msg.sample_count ?? msg.sampleCount,
            evaluatedAtTs: msg.evaluated_at_ts ?? msg.evaluatedAtTs ?? Date.now(),
          };
          setPerformanceHistory((prev) => {
            const filtered = prev.filter((p) => !(p.modelId === perf.modelId && p.streamId === perf.streamId));
            return [...filtered, perf];
          });
          setPerformance({
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalPnl: 0,
            averagePnl: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            mae: perf.mae,
            directionalAccuracy: perf.directionalAccuracy,
            samples: perf.sampleCount,
            lastUpdate: perf.evaluatedAtTs,
            modelId: perf.modelId,
            streamId: perf.streamId,
          });
          return;
        }
      }
    },
    [maxHistorySize]
  );

  // Handle incoming messages (supports both V3 and legacy V2 formats)
  const handleMessage = useCallback(
    (msg: any) => {
      // Unified V3 stream uses topic without type wrapper
      if (msg.topic) {
        handleV3Message(msg);
        return;
      }
    },
    [handleV3Message]
  );

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Connect to unified /ws/live endpoint
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    console.log('[MarketDataStream] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[MarketDataStream] WebSocket connected to /ws/live');
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
  const signals = predictions.filter((p) => p.signal !== 'flat');

  // Health fetch (hourly)
  useEffect(() => {
    let cancelled = false;

    const fetchHealth = async () => {
      try {
        const resp = await fetch('/api/live/health');
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        if (Array.isArray(data.streams)) {
          setHealth(
            data.streams.map((s: any) => ({
              streamId: s.id ?? s.streamId ?? s.stream_id ?? '',
              lastBarTs: s.lastBarTs ?? s.last_bar_ts ?? 0,
              lastIndicatorTs: s.lastIndicatorTs ?? s.last_indicator_ts ?? 0,
              ohlcvBufferSize: s.ohlcvBufferSize ?? 0,
              indicatorBufferSize: s.indicatorBufferSize ?? 0,
              featureCount: s.featureCount ?? 0,
              registeredTargets: s.registeredTargets ?? 0,
              featureHash: s.featureHash ?? 0,
              stale: Boolean(s.stale),
            }))
          );
        }
      } catch (err) {
        console.warn('[MarketDataStream] Health fetch failed', err);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return {
    connected,
    clientId,
    tradingRules,
    indicators,
    indicatorNames,
    ohlcv,
    atr,
    position,
    performance,
    performanceHistory,
    error,
    subscribedTopics,
    latestIndicator,
    latestOhlcv,
    predictions,
    targets,
    signals,
    health,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    requestSnapshot,
  };
}
