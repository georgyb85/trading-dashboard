import { ActiveModelCard } from '@/apps/walkforward/components/ActiveModelCard';
import { FoldResults } from '@/apps/walkforward/components/FoldResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { GoLiveModal } from '@/apps/walkforward/components/GoLiveModal';
import { useRunsContext } from '@/contexts/RunsContext';
import { useWalkforwardContext } from '@/contexts/WalkforwardContext';
import { toast } from '@/hooks/use-toast';
import { useGoLive, useActiveModel } from '@/hooks/useKrakenLive';
import { xgboostClient } from '@/lib/services/xgboostClient';
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

const LiveModelPage = () => {
  const { cachedRuns } = useRunsContext();
  const { liveModelResult, setLiveModelResult } = useWalkforwardContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const goLiveMutation = useGoLive();
  const { data: activeModel, isLoading: activeModelLoading, isError: activeModelError } = useActiveModel();

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

  const handleGoLive = (script: string) => {
    if (!selectedRun) {
      toast({ title: 'No run selected', description: 'Load a run from Walkforward first', variant: 'destructive' });
      return;
    }
    goLiveMutation.mutate({ run_id: selectedRun.run_id, indicator_script: script, run: selectedRun });
    setModalOpen(false);
  };

  // Load live performance data by calling xgboost training endpoint
  const loadLivePerformance = async () => {
    if (!selectedRun) {
      toast({ title: 'No run selected', description: 'Select a run first', variant: 'destructive' });
      return;
    }

    setIsLoadingPerformance(true);
    setPerformanceError(null);

    try {
      // Get the run's training config
      const run = selectedRun;

      // Calculate timestamps
      // Training data: use the run's original training period
      // Test data: from midnight today to now (live performance)
      const now = Date.now();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const midnightMs = today.getTime();

      // Get feature columns as array
      const featureColumns = Array.isArray(run.feature_columns)
        ? run.feature_columns
        : typeof run.feature_columns === 'string'
          ? run.feature_columns.split(',').map(s => s.trim())
          : [];

      // Use the run's original train/val timestamps if available, otherwise estimate
      const runConfig = (run as any).config || {};
      const trainStart = runConfig.train_start_timestamp || (midnightMs - 30 * 24 * 60 * 60 * 1000); // 30 days before midnight
      const trainEnd = runConfig.train_end_timestamp || (midnightMs - 24 * 60 * 60 * 1000); // 1 day before midnight
      const valStart = runConfig.val_start_timestamp || (midnightMs - 24 * 60 * 60 * 1000);
      const valEnd = runConfig.val_end_timestamp || midnightMs;

      const payload = {
        dataset: {
          dataset_id: run.dataset_id,
          feature_columns: featureColumns,
          target_column: String(run.target_column),
          train: { start_timestamp: trainStart, end_timestamp: trainEnd },
          validation: { start_timestamp: valStart, end_timestamp: valEnd },
          test: { start_timestamp: midnightMs, end_timestamp: now },
        },
        config: runConfig.xgboost_config || {
          max_depth: 4,
          learning_rate: 0.01,
          n_estimators: 2000,
          early_stopping_rounds: 200,
        },
      };

      console.log('[LiveModel] Loading live performance with payload:', payload);

      const result = await xgboostClient.train(payload);

      console.log('[LiveModel] Got live performance result:', result);
      setLiveModelResult(result);

      toast({
        title: 'Performance loaded',
        description: `Evaluated on ${result.test_samples || 0} live samples`
      });
    } catch (err) {
      console.error('[LiveModel] Failed to load live performance:', err);
      const message = err instanceof Error ? err.message : 'Failed to load performance';
      setPerformanceError(message);
      toast({
        title: 'Failed to load performance',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const hasActiveModel = activeModel && activeModel.model_id;
  const trainResult = liveModelResult || activeModel?.train_result || null;

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
                <p>3. Provide the indicator script that matches the run's features.</p>
                <p>4. Click <strong>Load Live Performance</strong> to see how the model performs on today's data.</p>
              </CardContent>
            </Card>
          </div>

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
          {/* Load Performance Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Live Performance</h3>
              <p className="text-sm text-muted-foreground">
                Evaluate model predictions against actual outcomes from midnight to now
              </p>
            </div>
            <Button
              onClick={loadLivePerformance}
              disabled={!selectedRun || isLoadingPerformance}
              variant="outline"
            >
              {isLoadingPerformance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Live Performance
                </>
              )}
            </Button>
          </div>

          {performanceError && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive">
                {performanceError}
              </CardContent>
            </Card>
          )}

          {trainResult ? (
            <FoldResults
              result={trainResult}
              isLoading={isLoadingPerformance}
              error={performanceError}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No performance data loaded yet.</p>
                <p className="text-sm mt-2">
                  Click "Load Live Performance" to evaluate the model on today's live data.
                </p>
              </CardContent>
            </Card>
          )}
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
                  <span className="text-muted-foreground">XGBoost Train</span>
                  <span className="text-xs">WS /api/xgboost-ws</span>
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
