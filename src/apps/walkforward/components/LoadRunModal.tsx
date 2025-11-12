import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useStage1Runs, useStage1RunDetail } from "@/apps/walkforward/lib/hooks";
import type { Stage1RunDetail } from "@/lib/stage1/types";
import { useRunsContext } from "@/contexts/RunsContext";

interface LoadRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
  onLoadRun: (run: Stage1RunDetail) => void;
}

export const LoadRunModal = ({
  open,
  onOpenChange,
  datasetId,
  onLoadRun,
}: LoadRunModalProps) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { getCachedRun, cacheRun, isRunCached } = useRunsContext();

  const {
    data: runs,
    isLoading: runsLoading,
    error: runsError,
  } = useStage1Runs(datasetId);

  const {
    data: runDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useStage1RunDetail(selectedRunId);

  // Cache the run detail when it's fetched
  useEffect(() => {
    if (runDetail && selectedRunId) {
      cacheRun(runDetail);
    }
  }, [runDetail, selectedRunId, cacheRun]);

  const handleLoadRun = () => {
    if (!selectedRunId) return;

    // Try to load from cache first
    const cachedRun = getCachedRun(selectedRunId);
    if (cachedRun) {
      console.log(`[LoadRunModal] Loading run ${selectedRunId.substring(0, 8)} from cache`);
      onLoadRun(cachedRun);
      onOpenChange(false);
      setSelectedRunId(null);
      return;
    }

    // Otherwise use the fetched run detail
    if (runDetail) {
      console.log(`[LoadRunModal] Loading run ${selectedRunId.substring(0, 8)} from API`);
      onLoadRun(runDetail);
      onOpenChange(false);
      setSelectedRunId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  const getFeaturesCount = (run: any) => {
    // Check feature_columns first (actual API field name)
    const featuresField = run.feature_columns || run.features;

    if (!featuresField) return 0;

    // If features is a string, try to parse it
    if (typeof featuresField === 'string') {
      try {
        const parsed = JSON.parse(featuresField);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (e) {
        return 0;
      }
    }

    // If it's already an array, return its length
    return Array.isArray(featuresField) ? featuresField.length : 0;
  };

  const getFoldCount = (run: any) => {
    // Check summary_metrics.folds first (actual API structure)
    if (run.summary_metrics) {
      // Handle if summary_metrics is a string (needs parsing)
      if (typeof run.summary_metrics === 'string') {
        try {
          const parsed = JSON.parse(run.summary_metrics);
          return parsed.folds ?? 0;
        } catch (e) {
          return 0;
        }
      }
      // Already an object
      if (typeof run.summary_metrics === 'object' && run.summary_metrics.folds) {
        return run.summary_metrics.folds;
      }
    }

    // Fall back to top-level fold_count
    return run.fold_count ?? 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Load Saved Run</DialogTitle>
          <DialogDescription>
            Select a run from the list below to load its configuration and results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-auto">
          {!datasetId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a dataset first before loading runs.
              </AlertDescription>
            </Alert>
          )}

          {runsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load runs: {runsError.message}
              </AlertDescription>
            </Alert>
          )}

          {detailError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load run details: {detailError.message}
              </AlertDescription>
            </Alert>
          )}

          {runsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : runs && runs.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Folds</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-16">Cache</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow
                      key={run.run_id}
                      className={`cursor-pointer ${
                        selectedRunId === run.run_id ? "bg-secondary" : ""
                      }`}
                      onClick={() => setSelectedRunId(run.run_id)}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          checked={selectedRunId === run.run_id}
                          onChange={() => setSelectedRunId(run.run_id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {run.run_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {getFoldCount(run)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getFeaturesCount(run)} features
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(run.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isRunCached(run.run_id) && (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" title="Cached" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No runs available for this dataset
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLoadRun}
            disabled={!selectedRunId || detailLoading}
          >
            {detailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
