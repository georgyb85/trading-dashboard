import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTradeSimulationRuns, useTradeSimulationDetail } from '@/lib/hooks/useApi';

const TradesimDashboard = () => {
  const { data: runs, isLoading: runsLoading, error: runsError } = useTradeSimulationRuns();
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | undefined>(undefined);

  const effectiveRuns = runs ?? [];

  useEffect(() => {
    if (!selectedSimulationId && effectiveRuns.length > 0) {
      setSelectedSimulationId(effectiveRuns[0].simulation_id);
    }
  }, [effectiveRuns, selectedSimulationId]);

  const {
    data: simulationDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useTradeSimulationDetail(selectedSimulationId);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Trading Simulation Runs</h1>
        <p className="text-muted-foreground text-sm">
          Stage 1 exposes historical simulation summaries and aggregated trade buckets. Per-trade execution logs and
          simulation scheduling APIs will arrive in later phases.
        </p>
      </div>

      {runsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load simulation runs: {runsError.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">Available Simulations</h2>
            <p className="text-sm text-muted-foreground">
              Choose a simulation to view configuration, performance metrics, and side-specific trade buckets.
            </p>
          </div>

          {runsLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <Select
              value={selectedSimulationId}
              onValueChange={(value) => setSelectedSimulationId(value)}
              disabled={effectiveRuns.length === 0}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder={effectiveRuns.length === 0 ? 'No simulations available' : 'Select a simulation'} />
              </SelectTrigger>
              <SelectContent>
                {effectiveRuns.map((run) => (
                  <SelectItem key={run.simulation_id} value={run.simulation_id}>
                    {run.simulation_id.slice(0, 8)} – {run.status}
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
              Failed to load simulation detail: {detailError.message}
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

        {!detailLoading && simulationDetail && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Simulation Metadata</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <MetadataRow label="Simulation ID" value={simulationDetail.run.simulation_id} />
                <MetadataRow label="Walkforward Run" value={simulationDetail.run.run_id} />
                <MetadataRow label="Dataset" value={simulationDetail.run.dataset_id} />
                <MetadataRow label="Mode" value={<Badge variant="outline">{simulationDetail.run.mode}</Badge>} />
                <MetadataRow label="Status" value={<Badge variant="secondary">{simulationDetail.run.status}</Badge>} />
                <MetadataRow label="QuestDB Namespace" value={simulationDetail.run.questdb_namespace} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
              <CodeBlock data={simulationDetail.run.config} />
              <h3 className="text-sm font-semibold text-foreground">Summary Metrics</h3>
              <CodeBlock data={simulationDetail.run.summary_metrics} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Trade Buckets</h3>
              {simulationDetail.buckets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No aggregated trade buckets recorded for this simulation.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Side</TableHead>
                        <TableHead className="text-center">Trades</TableHead>
                        <TableHead className="text-center">Wins</TableHead>
                        <TableHead className="text-right">Profit Factor</TableHead>
                        <TableHead className="text-right">Avg Return %</TableHead>
                        <TableHead className="text-right">Max Drawdown %</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationDetail.buckets.map((bucket) => (
                        <TableRow key={`${bucket.simulation_id}-${bucket.side}`}>
                          <TableCell className="font-medium">{bucket.side}</TableCell>
                          <TableCell className="text-center">{bucket.trade_count}</TableCell>
                          <TableCell className="text-center">{bucket.win_count}</TableCell>
                          <TableCell className="text-right">{formatMaybeNumber(bucket.profit_factor)}</TableCell>
                          <TableCell className="text-right">{formatMaybeNumber(bucket.avg_return_pct, 2)}</TableCell>
                          <TableCell className="text-right">{formatMaybeNumber(bucket.max_drawdown_pct, 2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{bucket.notes ?? '—'}</TableCell>
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
            No simulations are available yet. Once the backend stores historical runs you will see them listed here.
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

const formatMaybeNumber = (value?: number, fractionDigits = 2) => {
  if (typeof value !== 'number') {
    return '—';
  }
  return value.toFixed(fractionDigits);
};

export default TradesimDashboard;
