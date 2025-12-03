import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { LivePrediction } from '@/lib/kraken/types';

type TargetMap = Record<string, number | null>;

interface LiveStreamsState {
  predictions: LivePrediction[];
  targets: TargetMap;
  connected: boolean;
}

const LiveStreamsContext = createContext<LiveStreamsState>({ predictions: [], targets: {}, connected: false });

export const LiveStreamsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [predictions, setPredictions] = useState<LivePrediction[]>([]);
  const [targets, setTargets] = useState<TargetMap>({});
  const [connected, setConnected] = useState(false);
  const predsRef = useRef<LivePrediction[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let shouldReconnect = true;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      // Connect to unified V3 /ws/live endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/live`;

      console.log('[LiveStreams] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LiveStreams] Connected to /ws/live');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Handle V3 prediction topic
          // V3 format: { topic: "prediction", model_id, ts, prediction, long_threshold, short_threshold, feature_hash }
          if (msg.topic === 'prediction') {
            const pred: LivePrediction = {
              ts_ms: msg.ts,  // V3 uses 'ts', frontend uses 'ts_ms'
              model_id: msg.model_id,
              prediction: msg.prediction,
              long_threshold: msg.long_threshold,
              short_threshold: msg.short_threshold,
            };
            predsRef.current = [
              ...predsRef.current.filter((p) => !(p.model_id === pred.model_id && p.ts_ms === pred.ts_ms)),
              pred,
            ]
              .sort((a, b) => b.ts_ms - a.ts_ms)
              .slice(0, 200);
            setPredictions([...predsRef.current]);
          }

          // Handle V3 target topic
          // V3 format: { topic: "target", name, ts, value, horizon_bars, matured_at }
          if (msg.topic === 'target') {
            // Map V3 target to frontend format
            // Frontend uses model_id:ts_ms as key, V3 doesn't include model_id in target
            // Use 'active' as default model_id since targets are model-agnostic
            setTargets((prev) => ({
              ...prev,
              [`active:${msg.ts}`]: msg.value,
            }));
          }

          // Legacy format support (predictions plural) for backward compatibility
          if (msg.topic === 'predictions') {
            if (msg.type === 'snapshot' && Array.isArray(msg.predictions)) {
              const preds: LivePrediction[] = msg.predictions.map((p: any) => ({
                ts_ms: p.ts_ms ?? p.ts,
                model_id: p.model_id || msg.model_id,
                prediction: p.prediction,
                long_threshold: p.long_threshold,
                short_threshold: p.short_threshold,
                actual: p.target ?? p.actual,
              }));
              predsRef.current = preds.sort((a, b) => b.ts_ms - a.ts_ms).slice(0, 200);
              setPredictions([...predsRef.current]);
            } else if (msg.type === 'update') {
              const pred: LivePrediction = {
                ts_ms: msg.ts_ms ?? msg.ts,
                model_id: msg.model_id,
                prediction: msg.prediction,
                long_threshold: msg.thresholds?.long_optimal ?? msg.thresholds?.long ?? msg.long_threshold,
                short_threshold: msg.thresholds?.short_optimal ?? msg.thresholds?.short ?? msg.short_threshold,
              };
              predsRef.current = [
                ...predsRef.current.filter((p) => !(p.model_id === pred.model_id && p.ts_ms === pred.ts_ms)),
                pred,
              ]
                .sort((a, b) => b.ts_ms - a.ts_ms)
                .slice(0, 200);
              setPredictions([...predsRef.current]);
            }
          }

          // Legacy format support (targets plural) for backward compatibility
          if (msg.topic === 'targets' && msg.type === 'update') {
            setTargets((prev) => ({
              ...prev,
              [`${msg.model_id || 'active'}:${msg.ts_ms ?? msg.ts}`]: msg.value,
            }));
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = (event) => {
        console.error('[LiveStreams] WebSocket error:', event);
      };

      ws.onclose = () => {
        console.log('[LiveStreams] WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (shouldReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[LiveStreams] Reconnecting...');
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const value = useMemo(() => ({ predictions, targets, connected }), [predictions, targets, connected]);
  return <LiveStreamsContext.Provider value={value}>{children}</LiveStreamsContext.Provider>;
};

export const useLiveStreams = () => useContext(LiveStreamsContext);

