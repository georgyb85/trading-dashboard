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
      toast({ title: 'Go Live started', description: `Run ${data.run_id} is live` });
      queryClient.invalidateQueries({ queryKey: ['kraken', 'active_model'] });
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

