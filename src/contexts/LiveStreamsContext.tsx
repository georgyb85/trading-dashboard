import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { joinUrl } from '@/lib/url';
import { listTraderDeployments } from "@/lib/stage1/client";
import type { LivePrediction } from '@/lib/kraken/types';

type TargetMap = Record<string, number | null>;

type RawPrediction = {
  ts_ms?: number;
  ts?: number;
  model_id?: string;
  prediction?: number;
  long_threshold?: number;
  short_threshold?: number;
  target?: number | null;
  actual?: number | null;
};

const toLivePrediction = (payload: unknown, fallbackModelId: string): LivePrediction | null => {
  const raw = payload as RawPrediction;
  const tsMs = raw.ts_ms ?? raw.ts;
  if (typeof tsMs !== "number" || typeof raw.prediction !== "number") return null;

  return {
    ts_ms: tsMs,
    model_id: raw.model_id || fallbackModelId,
    prediction: raw.prediction,
    long_threshold: raw.long_threshold,
    short_threshold: raw.short_threshold,
    actual: raw.target ?? raw.actual,
  };
};

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

  // Fetch initial predictions for all active models via REST API
  useEffect(() => {
    const fetchInitialPredictions = async () => {
      try {
        const deploymentsRes = await listTraderDeployments(config.traderId, { enabled: true, limit: 500, offset: 0 });
        if (!deploymentsRes.success || !deploymentsRes.data) return;

        const activeDeployments = deploymentsRes.data;
        if (activeDeployments.length === 0) {
          console.log('[LiveStreams] No active models found');
          return;
        }

        // Fetch predictions for all active models in parallel
        const allPreds: LivePrediction[] = [];
        await Promise.all(
          activeDeployments.map(async (deployment) => {
            try {
              const predsRes = await fetch(
                joinUrl(config.krakenRestBaseUrl, `/api/live/predictions?model_id=${deployment.model_id}`)
              );
              if (!predsRes.ok) return;
              const data = await predsRes.json();

              if (data.predictions && Array.isArray(data.predictions)) {
                const preds: LivePrediction[] = data.predictions
                  .map((p: unknown) => toLivePrediction(p, deployment.model_id))
                  .filter((p): p is LivePrediction => p !== null);
                allPreds.push(...preds);
              }
            } catch (err) {
              console.error(`[LiveStreams] Failed to fetch predictions for model ${deployment.model_id}:`, err);
            }
          })
        );

        // Dedupe by model_id + ts_ms, sort by timestamp descending, limit to 200
        const predMap = new Map<string, LivePrediction>();
        for (const p of allPreds) {
          predMap.set(`${p.model_id}:${p.ts_ms}`, p);
        }
        predsRef.current = Array.from(predMap.values())
          .sort((a, b) => b.ts_ms - a.ts_ms)
          .slice(0, 200);
        console.log('[LiveStreams] Loaded initial predictions for', activeDeployments.length, 'active models:', predsRef.current.length, 'total');
        setPredictions([...predsRef.current]);
      } catch (err) {
        console.error('[LiveStreams] Failed to fetch initial predictions:', err);
      }
    };

    fetchInitialPredictions();
  }, []);

  useEffect(() => {
    let shouldReconnect = true;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      // Connect to unified V3 /ws/live endpoint
      const wsUrl = joinUrl(config.krakenWsBaseUrl, config.krakenLiveWsPath);

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
              const preds: LivePrediction[] = msg.predictions
                .map((p: unknown) => toLivePrediction(p, msg.model_id))
                .filter((p): p is LivePrediction => p !== null);
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
