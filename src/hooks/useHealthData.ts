import { useQuery } from '@tanstack/react-query';
import { krakenClient } from '@/lib/kraken/client';
import type { HealthResponse } from '@/lib/kraken/types';

export const useHealthData = () => {
  return useQuery({
    queryKey: ['kraken', 'health'],
    queryFn: async (): Promise<HealthResponse> => {
      const resp = await krakenClient.getHealth();
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to fetch health data');
      }
      return resp.data;
    },
    refetchInterval: 5_000, // Refresh every 5 seconds
    retry: 1,
  });
};
