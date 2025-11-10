import { useState } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { useStage1Runs, useStage1RunDetail } from "@/apps/walkforward/lib/hooks";
import type { Stage1RunDetail } from "@/lib/stage1/types";

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

  const handleLoadRun = () => {
    if (runDetail) {
      onLoadRun(runDetail);
      onOpenChange(false);
      setSelectedRunId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
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
                    <TableHead>Measurement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
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
                        {run.prediction_measurement}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            run.status === "completed"
                              ? "bg-success/10 text-success"
                              : run.status === "running"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {run.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(run.started_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(run.completed_at)}
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
