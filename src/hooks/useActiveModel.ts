import { useQuery } from '@tanstack/react-query';
import { krakenClient } from '@/lib/kraken/client';

export const useActiveModel = () => {
  return useQuery({
    queryKey: ['kraken', 'active_model'],
    queryFn: async () => {
      const resp = await krakenClient.getActiveModel();
      if (!resp.success) {
        throw new Error(resp.error || 'Failed to fetch active model');
      }
      return resp.data;
    },
    retry: false,
  });
};

