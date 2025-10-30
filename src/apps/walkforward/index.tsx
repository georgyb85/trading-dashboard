import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useWalkforwardRuns, useWalkforwardRunDetail } from '@/lib/hooks/useApi';

const WalkforwardDashboard = () => {
  const { data: runs, isLoading: runsLoading, error: runsError } = useWalkforwardRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);

  const effectiveRuns = runs ?? [];

  // Pick the first run as default once data arrives
  useEffect(() => {
    if (!selectedRunId && effectiveRuns.length > 0) {
      setSelectedRunId(effectiveRuns[0].run_id);
    }
  }, [effectiveRuns, selectedRunId]);

  const {
    data: runDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useWalkforwardRunDetail(selectedRunId);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Walk-forward Runs</h1>
        <p className="text-muted-foreground text-sm">
          Stage 1 surfaces historical walk-forward executions from the backend mock API. Creation and deletion endpoints
          are not yet available, so the dashboard operates in read-only mode.
        </p>
      </div>

      {runsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load runs: {runsError.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">Available Runs</h2>
            <p className="text-sm text-muted-foreground">
              Select a run to inspect configuration, metrics, and fold breakdowns.
            </p>
          </div>

          {runsLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select
              value={selectedRunId}
              onValueChange={(value) => setSelectedRunId(value)}
              disabled={effectiveRuns.length === 0}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder={effectiveRuns.length === 0 ? 'No runs available' : 'Select a run'} />
              </SelectTrigger>
              <SelectContent>
                {effectiveRuns.map((run) => (
                  <SelectItem key={run.run_id} value={run.run_id}>
                    {run.run_id.slice(0, 8)} – {run.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {detailError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load run detail: {detailError.message}
            </AlertDescription>
          </Alert>
        )}

        {detailLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!detailLoading && runDetail && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Run Metadata</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <MetadataRow label="Run ID" value={runDetail.run.run_id} />
                <MetadataRow label="Dataset" value={runDetail.run.dataset_id} />
                <MetadataRow label="Target" value={runDetail.run.target_column} />
                <MetadataRow label="Status" value={<Badge variant="outline">{runDetail.run.status}</Badge>} />
                <MetadataRow label="Requested By" value={runDetail.run.requested_by ?? '—'} />
                <MetadataRow label="Duration (ms)" value={runDetail.run.duration_ms?.toString() ?? '—'} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Hyperparameters</h3>
              <CodeBlock data={runDetail.run.hyperparameters} />
              <h3 className="text-sm font-semibold text-foreground">Walk Config</h3>
              <CodeBlock data={runDetail.run.walk_config} />
              <h3 className="text-sm font-semibold text-foreground">Summary Metrics</h3>
              <CodeBlock data={runDetail.run.summary_metrics} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Fold Breakdown</h3>
              {runDetail.folds.length === 0 ? (
                <p className="text-muted-foreground text-sm">No fold records available for this run.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fold</TableHead>
                        <TableHead className="text-center">Train Range</TableHead>
                        <TableHead className="text-center">Test Range</TableHead>
                        <TableHead className="text-center">Samples</TableHead>
                        <TableHead className="text-right">Best Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runDetail.folds.map((fold) => (
                        <TableRow key={`${fold.run_id}-${fold.fold_number}`}>
                          <TableCell className="font-medium">{fold.fold_number}</TableCell>
                          <TableCell className="text-center">{fold.train_start_idx} – {fold.train_end_idx}</TableCell>
                          <TableCell className="text-center">{fold.test_start_idx} – {fold.test_end_idx}</TableCell>
                          <TableCell className="text-center">
                            {fold.samples_train} / {fold.samples_test}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof fold.best_score === 'number' ? fold.best_score.toFixed(4) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {!runsLoading && effectiveRuns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No walk-forward runs are available yet. Once the backend ingests historical runs you will see them listed here.
          </p>
        )}
      </Card>
    </div>
  );
};

interface MetadataRowProps {
  label: string;
  value: ReactNode;
}

const MetadataRow = ({ label, value }: MetadataRowProps) => (
  <div>
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="text-sm text-foreground break-all">{value}</div>
  </div>
);

interface CodeBlockProps {
  data: Record<string, unknown>;
}

const CodeBlock = ({ data }: CodeBlockProps) => {
  const pretty = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return '—';
    }
    return JSON.stringify(data, null, 2);
  }, [data]);

  return (
    <pre className="bg-muted/40 rounded border border-border text-xs text-muted-foreground p-3 overflow-x-auto">
      {pretty}
    </pre>
  );
};

export default WalkforwardDashboard;
