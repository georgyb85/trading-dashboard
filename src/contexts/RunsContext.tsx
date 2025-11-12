import { createContext, useContext, useState, ReactNode } from 'react';
import type { Stage1RunDetail } from '@/lib/stage1/types';

interface RunsContextType {
  // Cache of all loaded runs, keyed by run_id
  cachedRuns: Map<string, Stage1RunDetail>;

  // Last run used in trade simulator
  lastTradesimRunId: string | null;

  // Get a cached run by ID
  getCachedRun: (runId: string) => Stage1RunDetail | undefined;

  // Add a run to cache
  cacheRun: (run: Stage1RunDetail) => void;

  // Set the last trade simulator run
  setLastTradesimRun: (runId: string) => void;

  // Check if a run is cached
  isRunCached: (runId: string) => boolean;
}

const RunsContext = createContext<RunsContextType | undefined>(undefined);

interface RunsProviderProps {
  children: ReactNode;
}

export const RunsProvider = ({ children }: RunsProviderProps) => {
  const [cachedRuns, setCachedRuns] = useState<Map<string, Stage1RunDetail>>(new Map());
  const [lastTradesimRunId, setLastTradesimRunId] = useState<string | null>(null);

  const getCachedRun = (runId: string): Stage1RunDetail | undefined => {
    return cachedRuns.get(runId);
  };

  const cacheRun = (run: Stage1RunDetail) => {
    setCachedRuns(prev => {
      const newMap = new Map(prev);
      newMap.set(run.run_id, run);
      console.log(`[RunsContext] Cached run ${run.run_id.substring(0, 8)}`);
      return newMap;
    });
  };

  const setLastTradesimRun = (runId: string) => {
    setLastTradesimRunId(runId);
    console.log(`[RunsContext] Set last tradesim run to ${runId.substring(0, 8)}`);
  };

  const isRunCached = (runId: string): boolean => {
    return cachedRuns.has(runId);
  };

  return (
    <RunsContext.Provider
      value={{
        cachedRuns,
        lastTradesimRunId,
        getCachedRun,
        cacheRun,
        setLastTradesimRun,
        isRunCached,
      }}
    >
      {children}
    </RunsContext.Provider>
  );
};

export const useRunsContext = () => {
  const context = useContext(RunsContext);
  if (context === undefined) {
    throw new Error('useRunsContext must be used within a RunsProvider');
  }
  return context;
};
