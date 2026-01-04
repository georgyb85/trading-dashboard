import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { krakenClient } from '@/lib/kraken/client';
import { getExecutorBindingByModel, upsertExecutorBinding } from '@/lib/stage1/client';
import type { GoLiveRequest } from '@/lib/kraken/types';
import type { Stage1ExecutorBindingUpsertRequest } from '@/lib/stage1/types';
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
      // Also invalidate metrics and predictions to flush stale data from previous model
      queryClient.invalidateQueries({ queryKey: ['kraken', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'predictions'] });
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
    // Cache for 5 minutes - data is considered fresh during this time
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes even when unused
    gcTime: 10 * 60 * 1000,
    // Refetch every 60s to catch server-side retrains (daily at 00:00 UTC)
    refetchInterval: 60_000,
    // Don't refetch when window regains focus if data is fresh
    refetchOnWindowFocus: false,
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
    // Cache for 5 minutes - data is considered fresh during this time
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 10 minutes even when unused
    gcTime: 10 * 60 * 1000,
    // Refetch every 60s to catch server-side retrains (daily at 00:00 UTC)
    refetchInterval: 60_000,
    // Don't refetch when window regains focus if data is fresh
    refetchOnWindowFocus: false,
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

export const useAvailableFeatures = (timeframe?: string) => {
  return useQuery({
    queryKey: ['kraken', 'available_features', timeframe],
    queryFn: async () => {
      const resp = await krakenClient.getAvailableFeatures(timeframe);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load available features');
      }
      return resp.data;
    },
    retry: false,
    // Features rarely change - cache for 10 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Model-Executor Decoupling Hooks

export const useDeployModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { runId: string; streamId?: string }) => {
      const resp = await krakenClient.deployModel(params.runId, params.streamId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Deploy failed');
      }
      return resp.data;
    },
    onSuccess: (data) => {
      toast({ title: 'Model deployed', description: `Model ${data.model_id} deployed in ${data.mode} mode` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Deploy failed';
      toast({ title: 'Deploy failed', description: message, variant: 'destructive' });
    },
  });
};

export const useAttachExecutor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: Stage1ExecutorBindingUpsertRequest) => {
      const resp = await upsertExecutorBinding(request);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Attach executor failed');
      }

      // Try recovery reset but don't fail if endpoint doesn't exist
      let recovery: { success: boolean; data?: any; error?: string } = { success: false };
      try {
        recovery = await krakenClient.recoveryReset();
      } catch (e) {
        console.warn('[useAttachExecutor] Recovery reset failed (endpoint may not exist):', e);
      }

      return { binding: resp.data, recovery: recovery.data ?? null, recoverySkipped: !recovery.success };
    },
    onSuccess: (result, request) => {
      const msg = result.recoverySkipped
        ? `Executor attached to model ${request.model_id.slice(0, 8)}… (recovery reset skipped)`
        : `Executor attached to model ${request.model_id.slice(0, 8)}…`;
      toast({ title: 'Executor attached', description: msg });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Attach executor failed';
      toast({ title: 'Attach executor failed', description: message, variant: 'destructive' });
    },
  });
};

export const useUpdateExecutor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: Stage1ExecutorBindingUpsertRequest) => {
      const resp = await upsertExecutorBinding(request);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Update executor failed');
      }

      // Try recovery reset but don't fail if endpoint doesn't exist
      let recovery: { success: boolean; data?: any; error?: string } = { success: false };
      try {
        recovery = await krakenClient.recoveryReset();
      } catch (e) {
        console.warn('[useUpdateExecutor] Recovery reset failed (endpoint may not exist):', e);
      }

      return { binding: resp.data, recovery: recovery.data ?? null, recoverySkipped: !recovery.success };
    },
    onSuccess: (result, request) => {
      const msg = result.recoverySkipped
        ? `Executor binding updated for model ${request.model_id.slice(0, 8)}… (recovery reset skipped)`
        : `Executor binding updated for model ${request.model_id.slice(0, 8)}…`;
      toast({ title: 'Executor updated', description: msg });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Update executor failed';
      toast({ title: 'Update executor failed', description: message, variant: 'destructive' });
    },
  });
};

export const useDetachExecutor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const binding = await getExecutorBindingByModel(modelId);
      if (!binding.success || !binding.data) {
        throw new Error(binding.error || 'Failed to load executor binding from Stage1');
      }

      const resp = await upsertExecutorBinding({
        trader_id: binding.data.trader_id || 'kraken',
        model_id: binding.data.model_id,
        stream_id: binding.data.stream_id,
        symbol: binding.data.symbol,
        exchange: binding.data.exchange,
        executor_config_id: binding.data.executor_config_id,
        enabled: false,
        priority: binding.data.priority,
        created_by: 'trading-dashboard',
      });
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Detach executor failed');
      }

      // Try recovery reset but don't fail if endpoint doesn't exist
      let recovery: { success: boolean; data?: any; error?: string } = { success: false };
      try {
        recovery = await krakenClient.recoveryReset();
      } catch (e) {
        console.warn('[useDetachExecutor] Recovery reset failed (endpoint may not exist):', e);
      }

      return { binding: resp.data, recovery: recovery.data ?? null, recoverySkipped: !recovery.success };
    },
    onSuccess: (result, modelId) => {
      const msg = result.recoverySkipped
        ? `Executor disabled for model ${modelId.slice(0, 8)}… (recovery reset skipped)`
        : `Executor disabled for model ${modelId.slice(0, 8)}…`;
      toast({ title: 'Executor detached', description: msg });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Detach executor failed';
      toast({ title: 'Detach executor failed', description: message, variant: 'destructive' });
    },
  });
};

export const useUndeployModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await krakenClient.undeployModel(modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Undeploy failed');
      }
      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Model undeployed', description: `Model ${modelId.slice(0, 8)}… removed` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (err: any) => {
      const message = err instanceof Error ? err.message : 'Undeploy failed';
      toast({ title: 'Undeploy failed', description: message, variant: 'destructive' });
    },
  });
};
