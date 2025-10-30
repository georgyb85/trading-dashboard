// React Query hooks for API endpoints

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  WalkforwardConfig,
  TradeSimulationConfig,
  LfsConfig,
} from '@/lib/types/api';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  datasets: {
    all: ['datasets'] as const,
    detail: (id: number) => ['datasets', id] as const,
    features: (id: number) => ['datasets', id, 'features'] as const,
    targets: (id: number) => ['datasets', id, 'targets'] as const,
  },
  walkforward: {
    all: ['walkforward', 'runs'] as const,
    detail: (id: number) => ['walkforward', 'runs', id] as const,
    folds: (id: number) => ['walkforward', 'runs', id, 'folds'] as const,
    fold: (runId: number, foldNumber: number) => ['walkforward', 'runs', runId, 'folds', foldNumber] as const,
  },
  tradesim: {
    all: ['tradesim', 'runs'] as const,
    detail: (id: number) => ['tradesim', 'runs', id] as const,
    trades: (id: number) => ['tradesim', 'runs', id, 'trades'] as const,
  },
  lfs: {
    all: ['lfs', 'runs'] as const,
    detail: (id: number) => ['lfs', 'runs', id] as const,
  },
};

// ============================================================================
// Dataset Hooks
// ============================================================================

export const useDatasets = () => {
  return useQuery({
    queryKey: queryKeys.datasets.all,
    queryFn: async () => {
      const response = await api.datasets.getAll();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch datasets');
      }
      return response.data!;
    },
  });
};

export const useDataset = (id: number) => {
  return useQuery({
    queryKey: queryKeys.datasets.detail(id),
    queryFn: async () => {
      const response = await api.datasets.getById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch dataset');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

export const useDatasetFeatures = (datasetId: number) => {
  return useQuery({
    queryKey: queryKeys.datasets.features(datasetId),
    queryFn: async () => {
      const response = await api.datasets.getFeatures(datasetId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch features');
      }
      return response.data!;
    },
    enabled: !!datasetId,
  });
};

export const useDatasetTargets = (datasetId: number) => {
  return useQuery({
    queryKey: queryKeys.datasets.targets(datasetId),
    queryFn: async () => {
      const response = await api.datasets.getTargets(datasetId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch targets');
      }
      return response.data!;
    },
    enabled: !!datasetId,
  });
};

// ============================================================================
// Walkforward Hooks
// ============================================================================

export const useWalkforwardRuns = () => {
  return useQuery({
    queryKey: queryKeys.walkforward.all,
    queryFn: async () => {
      const response = await api.walkforward.getRuns();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch walkforward runs');
      }
      return response.data!;
    },
  });
};

export const useWalkforwardRun = (id: number) => {
  return useQuery({
    queryKey: queryKeys.walkforward.detail(id),
    queryFn: async () => {
      const response = await api.walkforward.getRunById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch walkforward run');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

export const useWalkforwardFolds = (runId: number) => {
  return useQuery({
    queryKey: queryKeys.walkforward.folds(runId),
    queryFn: async () => {
      const response = await api.walkforward.getFolds(runId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch folds');
      }
      return response.data!;
    },
    enabled: !!runId,
  });
};

export const useCreateWalkforwardRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: WalkforwardConfig) => {
      const response = await api.walkforward.createRun(config);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create walkforward run');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.walkforward.all });
      toast({
        title: 'Run Created',
        description: 'Walkforward run has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteWalkforwardRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.walkforward.deleteRun(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete run');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.walkforward.all });
      toast({
        title: 'Run Deleted',
        description: 'Walkforward run has been deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// Trade Simulation Hooks
// ============================================================================

export const useTradeSimulationRuns = () => {
  return useQuery({
    queryKey: queryKeys.tradesim.all,
    queryFn: async () => {
      const response = await api.tradesim.getRuns();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch simulation runs');
      }
      return response.data!;
    },
  });
};

export const useTradeSimulationRun = (id: number) => {
  return useQuery({
    queryKey: queryKeys.tradesim.detail(id),
    queryFn: async () => {
      const response = await api.tradesim.getRunById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch simulation run');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

export const useTrades = (simulationId: number, tradeType?: 'Long' | 'Short') => {
  return useQuery({
    queryKey: [...queryKeys.tradesim.trades(simulationId), tradeType],
    queryFn: async () => {
      const response = await api.tradesim.getTrades(simulationId, { tradeType });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch trades');
      }
      return response.data!;
    },
    enabled: !!simulationId,
  });
};

export const useCreateTradeSimulation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: TradeSimulationConfig) => {
      const response = await api.tradesim.createRun(config);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create simulation run');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tradesim.all });
      toast({
        title: 'Simulation Created',
        description: 'Trade simulation has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// LFS Hooks
// ============================================================================

export const useLfsRuns = () => {
  return useQuery({
    queryKey: queryKeys.lfs.all,
    queryFn: async () => {
      const response = await api.lfs.getRuns();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch LFS runs');
      }
      return response.data!;
    },
  });
};

export const useLfsRun = (id: number) => {
  return useQuery({
    queryKey: queryKeys.lfs.detail(id),
    queryFn: async () => {
      const response = await api.lfs.getRunById(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch LFS run');
      }
      return response.data!;
    },
    enabled: !!id,
  });
};

export const useCreateLfsRun = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      datasetId: number;
      targetName: string;
      featureNames: string[];
      config: LfsConfig;
    }) => {
      const response = await api.lfs.createRun(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create LFS run');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lfs.all });
      toast({
        title: 'Analysis Started',
        description: 'LFS analysis has been started successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
