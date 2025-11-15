import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { Stage1RunDetail } from '@/lib/stage1/types';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';

interface TestModelCache {
  result: XGBoostTrainResult;
  runIndex: number;
  foldNumber: number;
  timestamp: number;
}

interface WalkforwardSimulationCache {
  datasetId: string;
  loadedRuns: Stage1RunDetail[];
  activeRunIndex: number;
  viewMode: "simulation" | "testModel";
  examinedFold: any;
  timestamp: number;
}

interface WalkforwardContextType {
  // Simulation cache
  getCachedSimulation: (datasetId: string) => WalkforwardSimulationCache | undefined;
  cacheSimulation: (cache: Omit<WalkforwardSimulationCache, 'timestamp'>) => void;

  // Test model cache
  getCachedTestModel: (datasetId: string, runIndex: number, foldNumber: number) => XGBoostTrainResult | undefined;
  cacheTestModel: (datasetId: string, runIndex: number, foldNumber: number, result: XGBoostTrainResult) => void;

  clearWalkforwardCache: () => void;
}

const WalkforwardContext = createContext<WalkforwardContextType | undefined>(undefined);

export const useWalkforwardContext = () => {
  const context = useContext(WalkforwardContext);
  if (!context) {
    throw new Error('useWalkforwardContext must be used within WalkforwardProvider');
  }
  return context;
};

interface WalkforwardProviderProps {
  children: ReactNode;
}

export const WalkforwardProvider = ({ children }: WalkforwardProviderProps) => {
  // Cache for simulation runs (keyed by datasetId)
  const [simulationCache, setSimulationCache] = useState<Map<string, WalkforwardSimulationCache>>(new Map());

  // Cache for test model results (keyed by datasetId:runIndex:foldNumber)
  const [testModelCache, setTestModelCache] = useState<Map<string, TestModelCache>>(new Map());

  const getTestModelKey = (datasetId: string, runIndex: number, foldNumber: number) =>
    `${datasetId}:${runIndex}:${foldNumber}`;

  // Simulation cache methods
  const getCachedSimulation = useCallback((datasetId: string): WalkforwardSimulationCache | undefined => {
    const cached = simulationCache.get(datasetId);

    if (cached) {
      console.log(`[WalkforwardContext] Simulation cache hit for ${datasetId}`);
      return cached;
    }

    console.log(`[WalkforwardContext] Simulation cache miss for ${datasetId}`);
    return undefined;
  }, [simulationCache]);

  const cacheSimulation = useCallback((newCache: Omit<WalkforwardSimulationCache, 'timestamp'>) => {
    console.log(`[WalkforwardContext] Caching simulation for ${newCache.datasetId}`);

    setSimulationCache(prev => {
      const updated = new Map(prev);
      updated.set(newCache.datasetId, {
        ...newCache,
        timestamp: Date.now(),
      });
      return updated;
    });
  }, []);

  // Test model cache methods
  const getCachedTestModel = useCallback((datasetId: string, runIndex: number, foldNumber: number): XGBoostTrainResult | undefined => {
    const key = getTestModelKey(datasetId, runIndex, foldNumber);
    const cached = testModelCache.get(key);

    if (cached) {
      console.log(`[WalkforwardContext] Test model cache hit for ${key}`);
      return cached.result;
    }

    console.log(`[WalkforwardContext] Test model cache miss for ${key}`);
    return undefined;
  }, [testModelCache]);

  const cacheTestModel = useCallback((datasetId: string, runIndex: number, foldNumber: number, result: XGBoostTrainResult) => {
    const key = getTestModelKey(datasetId, runIndex, foldNumber);
    console.log(`[WalkforwardContext] Caching test model for ${key}`);

    setTestModelCache(prev => {
      const updated = new Map(prev);
      updated.set(key, {
        result,
        runIndex,
        foldNumber,
        timestamp: Date.now(),
      });
      return updated;
    });
  }, []);

  const clearWalkforwardCache = useCallback(() => {
    console.log('[WalkforwardContext] Clearing all cached walkforward data');
    setSimulationCache(new Map());
    setTestModelCache(new Map());
  }, []);

  return (
    <WalkforwardContext.Provider
      value={{
        getCachedSimulation,
        cacheSimulation,
        getCachedTestModel,
        cacheTestModel,
        clearWalkforwardCache,
      }}
    >
      {children}
    </WalkforwardContext.Provider>
  );
};
