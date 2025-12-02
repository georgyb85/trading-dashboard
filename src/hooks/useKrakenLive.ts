import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { krakenClient } from '@/lib/kraken/client';
import type { GoLiveRequest } from '@/lib/kraken/types';
import { toast } from './use-toast';

export const useGoLive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GoLiveRequest) => {
      const resp = await krakenClient.goLive(payload);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Go Live failed');
      }
      return resp.data;
    },
    onSuccess: (data) => {
      toast({ title: 'Go Live started', description: `Model ${data.model_id || data.run_id} is live` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Go Live failed';
      toast({ title: 'Go Live error', description: message, variant: 'destructive' });
    },
  });
};

export const useActiveModel = () => {
  return useQuery({
    queryKey: ['kraken', 'active_model'],
    queryFn: async () => {
      const resp = await krakenClient.getActiveModel();
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load active model');
      }
      return resp.data;
    },
    retry: false,
  });
};

export const useLiveModels = () => {
  return useQuery({
    queryKey: ['kraken', 'live_models'],
    queryFn: async () => {
      const resp = await krakenClient.listModels();
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load live models');
      }
      return resp.data.models;
    },
    retry: false,
  });
};

export const useActivateModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await krakenClient.activateModel(modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Activate failed');
      }
      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Activated', description: `Model ${modelId} is now active` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Activate failed';
      toast({ title: 'Activate failed', description: message, variant: 'destructive' });
    },
  });
};

export const useRetrainModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await krakenClient.retrainModel(modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Retrain failed');
      }
      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Retrain started', description: `Model ${modelId} retrained` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Retrain failed';
      toast({ title: 'Retrain failed', description: message, variant: 'destructive' });
    },
  });
};

export const useDeactivateModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await krakenClient.deactivateModel(modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Deactivate failed');
      }
      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Deactivated', description: `Model ${modelId} deactivated` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Deactivate failed';
      toast({ title: 'Deactivate failed', description: message, variant: 'destructive' });
    },
  });
};

export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await krakenClient.deleteModel(modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Delete failed');
      }
      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Deleted', description: `Model ${modelId} removed` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    },
  });
};

export const useUpdateThresholds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { modelId: string; longThreshold: number; shortThreshold: number }) => {
      const resp = await krakenClient.updateThresholds(params.modelId, params.longThreshold, params.shortThreshold);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Update thresholds failed');
      }
      return resp.data;
    },
    onSuccess: (_, params) => {
      toast({ title: 'Thresholds updated', description: `Model ${params.modelId} thresholds applied` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Update thresholds failed';
      toast({ title: 'Threshold update failed', description: message, variant: 'destructive' });
    },
  });
};
