import { ActiveModelCard } from '@/apps/walkforward/components/ActiveModelCard';
import { FoldResults } from '@/apps/walkforward/components/FoldResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoLiveModal } from '@/apps/walkforward/components/GoLiveModal';
import { useRunsContext } from '@/contexts/RunsContext';
import { toast } from '@/hooks/use-toast';
import {
  useGoLive,
  useActiveModel,
  useLiveModels,
  useActivateModel,
  useRetrainModel,
  useDeactivateModel,
  useDeleteModel,
  useUpdateThresholds,
} from '@/hooks/useKrakenLive';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Activity, BarChart3, Settings, Info, RefreshCw, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { krakenClient } from '@/lib/kraken/client';
import { Input } from '@/components/ui/input';
import { useMarketDataContext } from '@/contexts/MarketDataContext';

const LiveModelPage = () => {
  const { cachedRuns } = useRunsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const goLiveMutation = useGoLive();
  const { data: activeModel, isLoading: activeModelLoading, isError: activeModelError } = useActiveModel();
  const { data: liveModels = [], isLoading: liveModelsLoading } = useLiveModels();
  const activateModel = useActivateModel();
  const retrainModel = useRetrainModel();
  const deactivateModel = useDeactivateModel();
  const deleteModel = useDeleteModel();
  const updateThresholds = useUpdateThresholds();
  const { indicators, indicatorNames, predictions: livePredictions, targets: liveTargets } = useMarketDataContext();

  // Get target horizon from active model metadata
  const targetHorizonBars = activeModel?.target_horizon_bars ?? 0;

  // Build a map of target values from indicators (TGT_* columns) by timestamp
  // Note: Backend sends 0 for unknown targets, so we exclude 0 values for recent timestamps
  // where the target horizon hasn't elapsed yet
  const indicatorTargetsByTimestamp = useMemo(() => {
    const targetMap: Record<number, number | null> = {};
    const tgtIndex = indicatorNames.findIndex(name => name.startsWith('TGT'));
    if (tgtIndex === -1) return targetMap;

    // Use target horizon from model metadata (bars * 1 hour per bar)
    const horizonMs = targetHorizonBars * 60 * 60 * 1000;
    const cutoffTime = Date.now() - horizonMs;

    for (const snapshot of indicators) {
      const tgtValue = snapshot.values[tgtIndex];
      if (tgtValue != null && !isNaN(tgtValue)) {
        // For recent timestamps, treat 0 as "unknown" since backend sends 0 for pending targets
        if (horizonMs > 0 && snapshot.timestamp > cutoffTime && tgtValue === 0) {
          targetMap[snapshot.timestamp] = null;
        } else {
          targetMap[snapshot.timestamp] = tgtValue;
        }
      }
    }
    return targetMap;
  }, [indicators, indicatorNames, targetHorizonBars]);
  const maturedTargetsByStreamTs = useMemo(() => {
    const map = new Map<string, number>();
    liveTargets.forEach((t) => {
      map.set(`${t.streamId}:${t.originTs}`, t.value);
    });
    return map;
  }, [liveTargets]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [longThresholdInput, setLongThresholdInput] = useState<string>('');
  const [shortThresholdInput, setShortThresholdInput] = useState<string>('');

  const runList = useMemo(() => Array.from(cachedRuns.values()), [cachedRuns]);
  const selectedRun = runList.find((r) => r.run_id === selectedRunId) || null;

  useEffect(() => {
    if (runList.length > 0 && !selectedRunId) {
      setSelectedRunId(runList[0].run_id);
    }
    if (runList.length === 0) {
      setSelectedRunId('');
    }
  }, [runList, selectedRunId]);

  useEffect(() => {
    if (activeModel?.model_id) {
      setSelectedModelId(activeModel.model_id);
    }
  }, [activeModel?.model_id]);

  useEffect(() => {
    if (activeModel?.long_threshold !== undefined) {
      setLongThresholdInput(activeModel.long_threshold.toString());
    }
    if (activeModel?.short_threshold !== undefined) {
      setShortThresholdInput(activeModel.short_threshold.toString());
    }
  }, [activeModel?.long_threshold, activeModel?.short_threshold]);

  const metricsModelId = selectedModelId || activeModel?.model_id || null;
  const metricsQuery = useQuery({
    queryKey: ['kraken', 'metrics', metricsModelId],
    enabled: !!metricsModelId,
    queryFn: async () => {
      const resp = await krakenClient.getMetrics(metricsModelId!);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load metrics');
      }
      return resp.data;
    },
    staleTime: 30_000,
  });
  const predictionsQuery = useQuery<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string }[]>({
    queryKey: ['kraken', 'predictions', metricsModelId],
    enabled: !!metricsModelId,
    queryFn: async () => {
      const resp = await krakenClient.getPredictions(metricsModelId!, 50);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load predictions');
      }
      return resp.data.predictions;
    },
    staleTime: 30_000,
  });

  const handleGoLive = () => {
    if (!selectedRun) {
      toast({ title: 'No run selected', description: 'Load a run from Walkforward first', variant: 'destructive' });
      return;
    }
    goLiveMutation.mutate({ run_id: selectedRun.run_id, run: selectedRun });
    setModalOpen(false);
  };

  const hasActiveModel = activeModel && activeModel.model_id;
  const trainResult: XGBoostTrainResult | null = (metricsQuery.data?.train_result as XGBoostTrainResult | undefined)
    || (activeModel?.train_result as XGBoostTrainResult | undefined)
    || null;
  const horizonBars = metricsQuery.data?.target_horizon_bars ?? activeModel?.target_horizon_bars ?? 0;
  const metricsError = metricsQuery.error instanceof Error ? metricsQuery.error.message : null;

  const combinedPredictions = useMemo(() => {
    const liveRows = livePredictions
      .filter((p) => !metricsModelId || p.modelId === metricsModelId)
      .map((p) => ({
        modelId: p.modelId,
        streamId: p.streamId,
        ts: p.ts,
        prediction: p.prediction,
        longThreshold: p.longThreshold,
        shortThreshold: p.shortThreshold,
      }));

    const historicalRows =
      predictionsQuery.data
        ?.filter((p) => !metricsModelId || p.model_id === metricsModelId)
        .map((p) => ({
          modelId: p.model_id ?? metricsModelId ?? 'unknown',
          streamId: activeModel?.stream_id ?? 'unknown',
          ts: p.ts_ms,
          prediction: p.prediction,
          longThreshold: p.long_threshold,
          shortThreshold: p.short_threshold,
        })) ?? [];

    return [...liveRows, ...historicalRows]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
  }, [activeModel?.stream_id, livePredictions, metricsModelId, predictionsQuery.data]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Live Model</h1>
            <p className="text-sm text-muted-foreground">Activate and monitor the current live trading model</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveModel && (
            <Badge variant="default" className="bg-green-600">
              Model Active
            </Badge>
          )}
          <Select
            value={selectedRunId}
            onValueChange={(value) => setSelectedRunId(value)}
            disabled={runList.length === 0}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={runList.length === 0 ? 'Load a run in Walkforward' : 'Select run'} />
            </SelectTrigger>
            <SelectContent>
              {runList.map((run) => (
                <SelectItem key={run.run_id} value={run.run_id}>
                  {run.run_id.slice(0, 8)}… ({run.dataset_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)} disabled={!selectedRun}>
            Go Live
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Model Performance
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ActiveModelCard />
            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Load a run in <strong>Walkforward Pilot</strong> first - it will appear in the selector above.</p>
                <p>2. Select the run and click <strong>Go Live</strong>.</p>
                <p>3. The system validates that the run's features are available in the live indicator buffer.</p>
                <p>4. Refresh metrics to see how the model performs on today's data.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Live Models</CardTitle>
            </CardHeader>
            <CardContent>
              {liveModelsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading models…
                </div>
              ) : liveModels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live models yet. Use Go Live to train the first one.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Dataset</TableHead>
                      <TableHead>Trained</TableHead>
                      <TableHead>Next Retrain</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveModels.map((model) => (
                      <TableRow key={model.model_id}>
                        <TableCell>
                          <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{model.model_id.slice(0, 10)}…</TableCell>
                        <TableCell className="font-mono text-xs">{model.dataset_id}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {model.trained_at_ms ? new Date(model.trained_at_ms).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {model.next_retrain_ms ? new Date(model.next_retrain_ms).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedModelId(model.model_id)}>
                            View
                          </Button>
                          {model.status === 'active' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateModel.mutate(model.model_id)}
                              disabled={deactivateModel.isPending}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => activateModel.mutate(model.model_id)}
                              disabled={activateModel.isPending}
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retrainModel.mutate(model.model_id)}
                            disabled={retrainModel.isPending}
                          >
                            Retrain
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (window.confirm(`Delete model ${model.model_id}?`)) {
                                deleteModel.mutate(model.model_id);
                              }
                            }}
                            disabled={deleteModel.isPending}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Show basic metrics if we have an active model */}
          {hasActiveModel && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Long Threshold</div>
                  <div className="text-xl font-mono font-semibold text-green-600">
                    {activeModel.long_threshold?.toFixed(4) ?? 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Short Threshold</div>
                  <div className="text-xl font-mono font-semibold text-red-600">
                    {activeModel.short_threshold?.toFixed(4) ?? 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Best Score</div>
                  <div className="text-xl font-mono font-semibold">
                    {activeModel.best_score?.toExponential(4) ?? 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Trained At</div>
                  <div className="text-sm font-mono">
                    {activeModel.trained_at_ms ? new Date(activeModel.trained_at_ms).toLocaleString() : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {!hasActiveModel && !activeModelLoading && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active model deployed yet.</p>
                <p className="text-sm mt-2">Select a run and click "Go Live" to deploy a model.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Model Performance Tab - Uses FoldResults for rich visualizations */}
        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Live Performance</h3>
              <p className="text-sm text-muted-foreground">
                Evaluate model predictions against actual outcomes using the latest trained model
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={metricsModelId ?? undefined}
                onValueChange={(value) => setSelectedModelId(value)}
                disabled={liveModels.length === 0}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {liveModels.map((m) => (
                    <SelectItem key={m.model_id} value={m.model_id}>
                      {m.model_id.slice(0, 8)}… ({m.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <Button
              onClick={() => metricsQuery.refetch()}
              disabled={!metricsModelId || metricsQuery.isFetching}
              variant="outline"
            >
              {metricsQuery.isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Metrics
                </>
              )}
            </Button>
            </div>
          </div>

          {metricsError && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive">
                {metricsError}
              </CardContent>
            </Card>
          )}

          {metricsModelId && (
            <Card>
              <CardHeader>
                <CardTitle>Adjust Live Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3 items-end">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Long Threshold</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={longThresholdInput}
                    onChange={(e) => setLongThresholdInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Short Threshold</div>
                  <Input
                    type="number"
                    step="0.01"
                    value={shortThresholdInput}
                    onChange={(e) => setShortThresholdInput(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const longVal = parseFloat(longThresholdInput);
                      const shortVal = parseFloat(shortThresholdInput);
                      if (Number.isNaN(longVal) || Number.isNaN(shortVal)) {
                        toast({ title: 'Invalid thresholds', description: 'Enter numeric values', variant: 'destructive' });
                        return;
                      }
                      updateThresholds.mutate({ modelId: metricsModelId, longThreshold: longVal, shortThreshold: shortVal });
                    }}
                    disabled={updateThresholds.isPending}
                  >
                    {updateThresholds.isPending ? 'Applying…' : 'Apply to Live Model'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {trainResult ? (
            <FoldResults
              result={trainResult}
              isLoading={metricsQuery.isFetching}
              error={metricsError}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No performance data loaded yet.</p>
                <p className="text-sm mt-2">
                  Select a model and refresh metrics to evaluate the latest live performance.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Predictions</CardTitle>
                {metricsModelId && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {metricsModelId.slice(0, 10)}…
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {horizonBars > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  Target horizon: {horizonBars} bars. Actuals shown only for predictions older than this.
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedPredictions.map((p) => {
                    const barStartDisplay = new Date(p.ts);
                    barStartDisplay.setMinutes(0, 0, 0);
                    const actual =
                      indicatorTargetsByTimestamp[p.ts] ??
                      maturedTargetsByStreamTs.get(`${p.streamId}:${p.ts}`) ??
                      null;
                    let trigger: string | null = null;
                    if (p.longThreshold !== undefined && p.prediction > p.longThreshold) {
                      trigger = 'LONG';
                    } else if (p.shortThreshold !== undefined && p.prediction < p.shortThreshold) {
                      trigger = 'SHORT';
                    }
                    const isActiveModel = liveModels.find((m) => m.model_id === p.modelId)?.status === 'active';
                    return (
                      <TableRow key={`${p.modelId}-${p.ts}`}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {isActiveModel && <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />}
                            {p.modelId.slice(0, 8)}…
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{barStartDisplay.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs">{Math.abs(p.prediction) < 0.01 ? p.prediction.toExponential(2) : p.prediction.toFixed(4)}</TableCell>
                        <TableCell className="font-mono text-xs">{actual != null ? actual.toFixed(2) : '—'}</TableCell>
                        <TableCell>
                          {trigger ? (
                            <Badge variant={trigger === 'LONG' ? 'default' : 'destructive'}>{trigger}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Selected Run Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {selectedRun ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Run ID</span>
                      <span className="font-mono text-xs">{selectedRun.run_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dataset</span>
                      <span className="font-mono text-xs">{selectedRun.dataset_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-mono text-xs">{String(selectedRun.target_column)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Features</span>
                      <span className="font-mono text-xs">
                        {Array.isArray(selectedRun.feature_columns)
                          ? `${selectedRun.feature_columns.length} features`
                          : 'N/A'}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No run selected</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Go Live</span>
                  <span className="text-xs">POST /api/live/go</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Model</span>
                  <span className="text-xs">GET /api/live/active_model</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Models</span>
                  <span className="text-xs">GET /api/live/models</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metrics</span>
                  <span className="text-xs">GET /api/live/models/:id/metrics</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature list if run is selected */}
          {selectedRun && Array.isArray(selectedRun.feature_columns) && (
            <Card>
              <CardHeader>
                <CardTitle>Feature Columns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedRun.feature_columns.map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="font-mono text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <GoLiveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleGoLive}
        run={selectedRun}
        isSubmitting={goLiveMutation.isPending}
      />

      {runList.length === 0 && (
        <div className="text-sm text-muted-foreground text-center p-4">
          No runs cached yet. Load a saved run from the Walkforward Pilot to enable Go Live.
        </div>
      )}
    </div>
  );
};

export default LiveModelPage;
