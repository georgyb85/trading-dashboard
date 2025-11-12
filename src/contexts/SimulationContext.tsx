import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { SimulateTradesResponse, TradeConfig, StressTestConfig } from '@/lib/stage1/types';

interface SimulationCache {
  results: SimulateTradesResponse;
  datasetId: string;
  runId: string;
  tradeConfig: TradeConfig;
  stressTestConfig: StressTestConfig;
  activeTab: string;
  tradeFilter: "all" | "long" | "short";
  timestamp: number;
}

interface SimulationContextType {
  getCachedSimulation: (datasetId: string, runId: string) => SimulationCache | undefined;
  cacheSimulation: (cache: Omit<SimulationCache, 'timestamp'>) => void;
  clearSimulationCache: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulationContext = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulationContext must be used within SimulationProvider');
  }
  return context;
};

interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider = ({ children }: SimulationProviderProps) => {
  // Use Map with composite key (datasetId + runId)
  const [cache, setCache] = useState<Map<string, SimulationCache>>(new Map());

  const getCacheKey = (datasetId: string, runId: string) => `${datasetId}:${runId}`;

  const getCachedSimulation = useCallback((datasetId: string, runId: string): SimulationCache | undefined => {
    const key = getCacheKey(datasetId, runId);
    const cached = cache.get(key);

    if (cached) {
      console.log(`[SimulationContext] Cache hit for ${key}`);
      return cached;
    }

    console.log(`[SimulationContext] Cache miss for ${key}`);
    return undefined;
  }, [cache]);

  const cacheSimulation = useCallback((newCache: Omit<SimulationCache, 'timestamp'>) => {
    const key = getCacheKey(newCache.datasetId, newCache.runId);
    console.log(`[SimulationContext] Caching simulation for ${key}`);

    setCache(prev => {
      const updated = new Map(prev);
      updated.set(key, {
        ...newCache,
        timestamp: Date.now(),
      });
      return updated;
    });
  }, []);

  const clearSimulationCache = useCallback(() => {
    console.log('[SimulationContext] Clearing all cached simulations');
    setCache(new Map());
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        getCachedSimulation,
        cacheSimulation,
        clearSimulationCache,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
