import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  IndicatorDataset,
  WalkforwardRun,
  WalkforwardRunDetail,
  TradeSimulationRun,
  TradeSimulationDetail,
} from '@/lib/types/api';

export const queryKeys = {
  datasets: {
    all: ['datasets'] as const,
    detail: (id: string) => ['datasets', id] as const,
  },
  walkforward: {
    all: ['walkforward', 'runs'] as const,
    detail: (id: string) => ['walkforward', 'runs', id] as const,
  },
  tradesim: {
    all: ['tradesim', 'runs'] as const,
    detail: (id: string) => ['tradesim', 'runs', id] as const,
  },
};

// ---------------------------------------------------------------------------
// Dataset hooks
// ---------------------------------------------------------------------------

export const useDatasets = () => {
  return useQuery<IndicatorDataset[], Error>({
    queryKey: queryKeys.datasets.all,
    queryFn: async () => {
      const response = await api.datasets.getAll();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load datasets');
      }
      return response.data;
    },
  });
};

export const useDataset = (id?: string) => {
  return useQuery<IndicatorDataset, Error>({
    queryKey: queryKeys.datasets.detail(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Dataset id required');
      }
      const response = await api.datasets.getById(id);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load dataset');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Walk-forward hooks
// ---------------------------------------------------------------------------

export const useWalkforwardRuns = () => {
  return useQuery<WalkforwardRun[], Error>({
    queryKey: queryKeys.walkforward.all,
    queryFn: async () => {
      const response = await api.walkforward.getRuns();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load walkforward runs');
      }
      return response.data;
    },
  });
};

export const useWalkforwardRunDetail = (id?: string) => {
  return useQuery<WalkforwardRunDetail, Error>({
    queryKey: queryKeys.walkforward.detail(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Run id required');
      }
      const response = await api.walkforward.getRunDetail(id);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load run detail');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Trade simulation hooks
// ---------------------------------------------------------------------------

export const useTradeSimulationRuns = () => {
  return useQuery<TradeSimulationRun[], Error>({
    queryKey: queryKeys.tradesim.all,
    queryFn: async () => {
      const response = await api.tradesim.getRuns();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load simulation runs');
      }
      return response.data;
    },
  });
};

export const useTradeSimulationDetail = (id?: string) => {
  return useQuery<TradeSimulationDetail, Error>({
    queryKey: queryKeys.tradesim.detail(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Simulation id required');
      }
      const response = await api.tradesim.getRunDetail(id);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to load simulation detail');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

