import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { BuildIndicatorsResponse } from '@/lib/stage1/types';

interface IndicatorCache {
  datasetId: string;
  script: string;
  maxRows: number;
  selectedColumn: string;
  isValidated: boolean;
  buildResult: BuildIndicatorsResponse | null;
  timestamp: number;
}

interface IndicatorContextType {
  getCachedIndicators: (datasetId: string) => IndicatorCache | undefined;
  cacheIndicators: (cache: Omit<IndicatorCache, 'timestamp'>) => void;
  clearIndicatorCache: () => void;
}

const IndicatorContext = createContext<IndicatorContextType | undefined>(undefined);

export const useIndicatorContext = () => {
  const context = useContext(IndicatorContext);
  if (!context) {
    throw new Error('useIndicatorContext must be used within IndicatorProvider');
  }
  return context;
};

interface IndicatorProviderProps {
  children: ReactNode;
}

export const IndicatorProvider = ({ children }: IndicatorProviderProps) => {
  // Cache for indicator builder state (keyed by datasetId)
  const [cache, setCache] = useState<Map<string, IndicatorCache>>(new Map());

  const getCachedIndicators = useCallback((datasetId: string): IndicatorCache | undefined => {
    const cached = cache.get(datasetId);

    if (cached) {
      console.log(`[IndicatorContext] Cache hit for dataset ${datasetId}`);
      return cached;
    }

    console.log(`[IndicatorContext] Cache miss for dataset ${datasetId}`);
    return undefined;
  }, [cache]);

  const cacheIndicators = useCallback((newCache: Omit<IndicatorCache, 'timestamp'>) => {
    console.log(`[IndicatorContext] Caching indicators for dataset ${newCache.datasetId}`);

    setCache(prev => {
      const updated = new Map(prev);
      updated.set(newCache.datasetId, {
        ...newCache,
        timestamp: Date.now(),
      });
      return updated;
    });
  }, []);

  const clearIndicatorCache = useCallback(() => {
    console.log('[IndicatorContext] Clearing all cached indicators');
    setCache(new Map());
  }, []);

  return (
    <IndicatorContext.Provider
      value={{
        getCachedIndicators,
        cacheIndicators,
        clearIndicatorCache,
      }}
    >
      {children}
    </IndicatorContext.Provider>
  );
};
