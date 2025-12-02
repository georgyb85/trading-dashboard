import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { LivePrediction, LiveTargetUpdate } from '@/lib/kraken/types';

type TargetMap = Record<string, number | null>;

interface LiveStreamsState {
  predictions: LivePrediction[];
  targets: TargetMap;
}

const LiveStreamsContext = createContext<LiveStreamsState>({ predictions: [], targets: {} });

export const LiveStreamsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [predictions, setPredictions] = useState<LivePrediction[]>([]);
  const [targets, setTargets] = useState<TargetMap>({});
  const predsRef = useRef<LivePrediction[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws/predictions`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.topic === 'predictions' && msg.type === 'update') {
          const pred: LivePrediction = {
            ts_ms: msg.ts_ms,
            model_id: msg.model_id,
            prediction: msg.prediction,
            long_threshold: msg.thresholds?.long_optimal ?? msg.thresholds?.long,
            short_threshold: msg.thresholds?.short_optimal ?? msg.thresholds?.short,
          };
          predsRef.current = [...predsRef.current.filter((p) => !(p.model_id === pred.model_id && p.ts_ms === pred.ts_ms)), pred]
            .sort((a, b) => b.ts_ms - a.ts_ms)
            .slice(0, 200);
          setPredictions([...predsRef.current]);
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/ws/targets`);
    ws.onmessage = (event) => {
      try {
        const msg: LiveTargetUpdate = JSON.parse(event.data);
        if (msg.topic === 'targets' && msg.type === 'update') {
          setTargets((prev) => ({
            ...prev,
            [`${msg.model_id || 'active'}:${msg.ts_ms}`]: msg.value,
          }));
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, []);

  const value = useMemo(() => ({ predictions, targets }), [predictions, targets]);
  return <LiveStreamsContext.Provider value={value}>{children}</LiveStreamsContext.Provider>;
};

export const useLiveStreams = () => useContext(LiveStreamsContext);

