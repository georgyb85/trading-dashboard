import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { config } from "@/lib/config";
import { krakenClient } from '@/lib/kraken/client';
import {
  deleteTraderDeployment,
  disableTraderDeployment,
  enableTraderDeployment,
  getExecutorBindingByModel,
  listExecutorBindings,
  listTraderDeployments,
  upsertExecutorBinding,
} from "@/lib/stage1/client";
import type { GoLiveRequest, KrakenApiResponse, LiveModelSummary, RecoveryResetResponse } from "@/lib/kraken/types";
import type { Stage1ExecutorBinding, Stage1ExecutorBindingUpsertRequest, Stage1TraderDeployment } from "@/lib/stage1/types";
import { toast } from './use-toast';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

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
      queryClient.invalidateQueries({ queryKey: ["stage1", "deployments"] });
      // Also invalidate metrics and predictions to flush stale data from previous model
      queryClient.invalidateQueries({ queryKey: ['kraken', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'predictions'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Go Live error',
        description: getErrorMessage(error, 'Go Live failed'),
        variant: 'destructive',
      });
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
      const traderId = config.traderId;
      const [deploymentsResp, bindingsResp, runtimeModelsResp] = await Promise.all([
        listTraderDeployments(traderId, { limit: 500, offset: 0 }),
        listExecutorBindings({ traderId, limit: 500, offset: 0 }),
        krakenClient.listModels(),
      ]);

      if (!deploymentsResp.success || !deploymentsResp.data) {
        throw new Error(deploymentsResp.error || "Failed to load Stage1 deployments");
      }

      const runtimeByModelId = new Map<string, LiveModelSummary>();
      if (runtimeModelsResp.success && runtimeModelsResp.data?.models) {
        for (const model of runtimeModelsResp.data.models) {
          runtimeByModelId.set(model.model_id, model);
        }
      }

      const bestBindingByModelId = new Map<string, Stage1ExecutorBinding>();
      if (bindingsResp.success && bindingsResp.data) {
        for (const binding of bindingsResp.data) {
          const existing = bestBindingByModelId.get(binding.model_id);
          if (!existing || binding.priority > existing.priority) {
            bestBindingByModelId.set(binding.model_id, binding);
          }
        }
      }

      return deploymentsResp.data.map((deployment: Stage1TraderDeployment) => {
        const runtime = runtimeByModelId.get(deployment.model_id);
        const binding = bestBindingByModelId.get(deployment.model_id);

        return {
          ...(runtime || {}),
          model_id: deployment.model_id,
          run_id: deployment.run_id || runtime?.run_id || deployment.model_id,
          stream_id: deployment.stream_id || runtime?.stream_id,
          dataset_id: deployment.dataset_id || runtime?.dataset_id || deployment.stream_id,
          status: deployment.enabled ? "active" : "inactive",
          version: runtime?.version ?? 0,
          trained_at_ms: runtime?.trained_at_ms ?? 0,
          next_retrain_ms: runtime?.next_retrain_ms,
          long_threshold: deployment.long_threshold,
          short_threshold: deployment.short_threshold,
          feature_hash: deployment.feature_hash || runtime?.feature_hash,
          target_horizon_bars: deployment.target_horizon_bars,
          has_executor: !!binding,
          executor_enabled: binding?.enabled ?? false,
        };
      });
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
      const resp = await enableTraderDeployment(config.traderId, modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || "Enable deployment failed");
      }

      // Best-effort apply on Kraken (operator endpoint). Stage1 remains source of truth.
      const reset = await krakenClient.recoveryReset();
      if (!reset.success || reset.data?.success === false) {
        toast({
          title: 'Kraken reconcile failed',
          description: reset.error || reset.data?.message || 'Recovery reset failed',
          variant: 'destructive',
        });
      }

      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Activated', description: `Model ${modelId} is now active` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
      queryClient.invalidateQueries({ queryKey: ["stage1", "deployments"] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Activate failed',
        description: getErrorMessage(error, 'Activate failed'),
        variant: 'destructive',
      });
    },
  });
};

export const useDeactivateModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await disableTraderDeployment(config.traderId, modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || "Disable deployment failed");
      }

      const reset = await krakenClient.recoveryReset();
      if (!reset.success || reset.data?.success === false) {
        toast({
          title: 'Kraken reconcile failed',
          description: reset.error || reset.data?.message || 'Recovery reset failed',
          variant: 'destructive',
        });
      }

      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: "Deactivated", description: `Model ${modelId} is now inactive` });
      queryClient.invalidateQueries({ queryKey: ["kraken", "live_models"] });
      queryClient.invalidateQueries({ queryKey: ["kraken", "active_model"] });
      queryClient.invalidateQueries({ queryKey: ["stage1", "deployments"] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Deactivate failed',
        description: getErrorMessage(error, 'Deactivate failed'),
        variant: 'destructive',
      });
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
    onError: (error: unknown) => {
      toast({
        title: 'Retrain failed',
        description: getErrorMessage(error, 'Retrain failed'),
        variant: 'destructive',
      });
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
    onError: (error: unknown) => {
      toast({
        title: 'Delete failed',
        description: getErrorMessage(error, 'Delete failed'),
        variant: 'destructive',
      });
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
    onError: (error: unknown) => {
      toast({
        title: 'Threshold update failed',
        description: getErrorMessage(error, 'Update thresholds failed'),
        variant: 'destructive',
      });
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
    onError: (error: unknown) => {
      toast({
        title: 'Deploy failed',
        description: getErrorMessage(error, 'Deploy failed'),
        variant: 'destructive',
      });
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

      const recovery = await krakenClient.recoveryReset();
      const recoveryOk = recovery.success && recovery.data?.success !== false;

      return {
        binding: resp.data,
        recovery: recovery.data ?? null,
        recoveryOk,
        recoveryError: recovery.error || recovery.data?.message,
      };
    },
    onSuccess: (result, request) => {
      const msg = `Executor attached to model ${request.model_id.slice(0, 8)}…`;
      toast({ title: 'Executor attached', description: msg });
      if (!result.recoveryOk) {
        toast({
          title: 'Kraken reconcile failed',
          description: result.recoveryError || 'Recovery reset failed',
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Attach executor failed',
        description: getErrorMessage(error, 'Attach executor failed'),
        variant: 'destructive',
      });
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

      const recovery = await krakenClient.recoveryReset();
      const recoveryOk = recovery.success && recovery.data?.success !== false;

      return {
        binding: resp.data,
        recovery: recovery.data ?? null,
        recoveryOk,
        recoveryError: recovery.error || recovery.data?.message,
      };
    },
    onSuccess: (result, request) => {
      const msg = `Executor binding updated for model ${request.model_id.slice(0, 8)}…`;
      toast({ title: 'Executor updated', description: msg });
      if (!result.recoveryOk) {
        toast({
          title: 'Kraken reconcile failed',
          description: result.recoveryError || 'Recovery reset failed',
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Update executor failed',
        description: getErrorMessage(error, 'Update executor failed'),
        variant: 'destructive',
      });
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
        trader_id: binding.data.trader_id || config.traderId,
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

      const recovery = await krakenClient.recoveryReset();
      const recoveryOk = recovery.success && recovery.data?.success !== false;

      return {
        binding: resp.data,
        recovery: recovery.data ?? null,
        recoveryOk,
        recoveryError: recovery.error || recovery.data?.message,
      };
    },
    onSuccess: (result, modelId) => {
      const msg = `Executor disabled for model ${modelId.slice(0, 8)}…`;
      toast({ title: 'Executor detached', description: msg });
      if (!result.recoveryOk) {
        toast({
          title: 'Kraken reconcile failed',
          description: result.recoveryError || 'Recovery reset failed',
          variant: 'destructive',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Detach executor failed',
        description: getErrorMessage(error, 'Detach executor failed'),
        variant: 'destructive',
      });
    },
  });
};

export const useUndeployModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      const resp = await deleteTraderDeployment(config.traderId, modelId);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || "Delete deployment failed");
      }

      const reset = await krakenClient.recoveryReset();
      if (!reset.success || reset.data?.success === false) {
        toast({
          title: 'Kraken reconcile failed',
          description: reset.error || reset.data?.message || 'Recovery reset failed',
          variant: 'destructive',
        });
      }

      return resp.data;
    },
    onSuccess: (_, modelId) => {
      toast({ title: 'Model undeployed', description: `Model ${modelId.slice(0, 8)}… removed` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'live_models'] });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
      queryClient.invalidateQueries({ queryKey: ["stage1", "deployments"] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Undeploy failed',
        description: getErrorMessage(error, 'Undeploy failed'),
        variant: 'destructive',
      });
    },
  });
};
