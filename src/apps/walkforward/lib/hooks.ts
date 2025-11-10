// React Query hooks for Stage1 API

import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { listDatasets, listRuns, getRun, getRunPredictions } from '@/lib/stage1/client';
import type {
  Stage1DatasetSummary,
  Stage1RunSummary,
  Stage1RunDetail,
} from '@/lib/stage1/types';

/**
 * Fetch all datasets from Stage1 API
 */
export const useStage1Datasets = () => {
  return useQuery<Stage1DatasetSummary[], Error>({
    queryKey: ['stage1', 'datasets'],
    queryFn: async () => {
      const response = await listDatasets();

      if (!response.success || !response.data) {
        const error = response.error || 'Failed to load datasets';
        toast({
          title: 'Error loading datasets',
          description: error,
          variant: 'destructive',
        });
        throw new Error(error);
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch runs for a specific dataset
 */
export const useStage1Runs = (datasetId: string | null) => {
  return useQuery<Stage1RunSummary[], Error>({
    queryKey: ['stage1', 'runs', datasetId],
    queryFn: async () => {
      if (!datasetId) {
        throw new Error('Dataset ID is required');
      }

      const response = await listRuns(datasetId);

      if (!response.success || !response.data) {
        const error = response.error || 'Failed to load runs';
        toast({
          title: 'Error loading runs',
          description: error,
          variant: 'destructive',
        });
        throw new Error(error);
      }

      console.log('[useStage1Runs] Raw response data:', response.data);
      console.log('[useStage1Runs] First run:', response.data[0]);
      console.log('[useStage1Runs] First run fold_count type:', typeof response.data[0]?.fold_count, response.data[0]?.fold_count);
      console.log('[useStage1Runs] First run features type:', typeof response.data[0]?.features, response.data[0]?.features);

      return response.data;
    },
    enabled: !!datasetId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Fetch detailed information for a specific run including folds
 */
export const useStage1RunDetail = (runId: string | null) => {
  return useQuery<Stage1RunDetail, Error>({
    queryKey: ['stage1', 'run', runId],
    queryFn: async () => {
      if (!runId) {
        throw new Error('Run ID is required');
      }

      const response = await getRun(runId);

      if (!response.success || !response.data) {
        const error = response.error || 'Failed to load run details';
        toast({
          title: 'Error loading run details',
          description: error,
          variant: 'destructive',
        });
        throw new Error(error);
      }

      return response.data;
    },
    enabled: !!runId,
    staleTime: 1000 * 60 * 10, // 10 minutes (runs don't change often)
  });
};

/**
 * Fetch predictions for a specific run (optional for future trade-sim seeding)
 */
export const useStage1Predictions = (runId: string | null, enabled = false) => {
  return useQuery<any, Error>({
    queryKey: ['stage1', 'predictions', runId],
    queryFn: async () => {
      if (!runId) {
        throw new Error('Run ID is required');
      }

      const response = await getRunPredictions(runId, 'json');

      if (!response.success || !response.data) {
        const error = response.error || 'Failed to load predictions';
        toast({
          title: 'Error loading predictions',
          description: error,
          variant: 'destructive',
        });
        throw new Error(error);
      }

      return response.data;
    },
    enabled: !!runId && enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};
