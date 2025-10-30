import { useState, useEffect } from "react";
import { SimulationHeader } from "@/apps/walkforward/components/SimulationHeader";
import { ConfigurationPanel } from "@/apps/walkforward/components/ConfigurationPanel";
import { PerformanceChart } from "@/apps/walkforward/components/PerformanceChart";
import { PerformanceSummary } from "@/apps/walkforward/components/PerformanceSummary";
import { RunDetails } from "@/apps/walkforward/components/RunDetails";
import { FoldConfigPanel } from "@/apps/walkforward/components/FoldConfigPanel";
import { FoldResults } from "@/apps/walkforward/components/FoldResults";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useWalkforwardRuns, useWalkforwardFolds, useCreateWalkforwardRun, useDeleteWalkforwardRun } from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const WalkforwardDashboard = () => {
  // API hooks
  const { data: runsResponse, isLoading: runsLoading, error: runsError } = useWalkforwardRuns();
  const createRunMutation = useCreateWalkforwardRun();
  const deleteRunMutation = useDeleteWalkforwardRun();

  // Configuration state
  const [model, setModel] = useState("xgboost");
  const [dataSource, setDataSource] = useState("btc_1h");
  const [target, setTarget] = useState("TGT_315");
  const [selectedFeatures, setSelectedFeatures] = useState([
    "PRICE_MI", "R_PROD_MORLET", "VWMA_RATIO_M", "VWMA_RATIO_L",
    "ATR_RATIO_L", "VOL_MAX_PS", "BOL_WIDTH_S", "BOL_WIDTH_M", "PV_FIT_M"
  ]);
  const [trainSize, setTrainSize] = useState(650);
  const [testSize, setTestSize] = useState(24);
  const [trainTestGap, setTrainTestGap] = useState(4);
  const [stepSize, setStepSize] = useState(24);
  const [startFold, setStartFold] = useState(0);
  const [endFold, setEndFold] = useState(-1);
  const [initialOffset, setInitialOffset] = useState(0);
  const [maxDepth, setMaxDepth] = useState(4);
  const [minChildWeight, setMinChildWeight] = useState(22.6);
  const [learningRate, setLearningRate] = useState(0.01);
  const [numRounds, setNumRounds] = useState(2000);
  const [earlyStopping, setEarlyStopping] = useState(200);
  const [minRounds, setMinRounds] = useState(100);
  const [subsample, setSubsample] = useState(1.0);
  const [colsampleBytree, setColsampleBytree] = useState(0.6);
  const [lambda, setLambda] = useState(2.0);
  const [forceMinimumTraining, setForceMinimumTraining] = useState(true);
  const [objective, setObjective] = useState("reg:quantileerror");
  const [quantileAlpha, setQuantileAlpha] = useState(0.95);
  const [thresholdMethod, setThresholdMethod] = useState("OptimalROC");

  // UI state
  const [showConfig, setShowConfig] = useState(true);
  const [showFoldConfig, setShowFoldConfig] = useState(true);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"simulation" | "testModel">("simulation");
  const [examinedFold, setExaminedFold] = useState<any>(null);

  // Test Model state
  const [foldTrainStart, setFoldTrainStart] = useState("");
  const [foldTrainEnd, setFoldTrainEnd] = useState("");
  const [foldTestStart, setFoldTestStart] = useState("");
  const [foldTestEnd, setFoldTestEnd] = useState("");
  const [foldFeatures, setFoldFeatures] = useState<string[]>([]);
  const [foldTarget, setFoldTarget] = useState("");
  const [foldTradingThreshold, setFoldTradingThreshold] = useState("0.798373");

  // Fetch folds for active run
  const { data: activeFolds } = useWalkforwardFolds(activeRunId || 0);

  // Process runs data
  const runs = runsResponse?.data || [];

  // Set initial active run
  useEffect(() => {
    if (runs.length > 0 && !activeRunId) {
      setActiveRunId(runs[0].id);
    }
  }, [runs, activeRunId]);

  const handleStartSimulation = async () => {
    const config = {
      model,
      dataSource,
      target,
      features: selectedFeatures,
      trainSize,
      testSize,
      trainTestGap,
      stepSize,
      startFold,
      endFold,
      initialOffset,
      maxDepth,
      minChildWeight,
      learningRate,
      numRounds,
      earlyStopping,
      minRounds,
      subsample,
      colsampleBytree,
      lambda,
      forceMinimumTraining,
      objective,
      quantileAlpha,
      thresholdMethod,
    };

    try {
      const newRun = await createRunMutation.mutateAsync(config);
      if (newRun) {
        setActiveRunId(newRun.id);
      }
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to create run:', error);
    }
  };

  const handleReset = () => {
    setActiveRunId(null);
    toast({
      title: "Reset Complete",
      description: "All selections have been cleared.",
    });
  };

  const handleCloseRun = async (runId: number) => {
    try {
      await deleteRunMutation.mutateAsync(runId);
      if (activeRunId === runId) {
        setActiveRunId(runs.length > 1 ? runs[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete run:', error);
    }
  };

  const handleExamineFold = (runId: number, fold: any) => {
    setExaminedFold({ runId, fold });
    setFoldTrainStart(String(fold.train_start_idx));
    setFoldTrainEnd(String(fold.train_end_idx));
    setFoldTestStart(String(fold.test_start_idx));
    setFoldTestEnd(String(fold.test_end_idx));
    const currentRun = runs.find((r) => r.id === runId);
    if (currentRun && currentRun.config) {
      setFoldFeatures(currentRun.config.features || []);
      setFoldTarget(currentRun.config.target || "");
    }
    setViewMode("testModel");
  };

  const handleTrainFold = () => {
    toast({
      title: "Training Started",
      description: "Model training and testing in progress...",
    });
  };

  // Convert runs and folds to format expected by components
  const runsForDisplay = runs.map((run, idx) => ({
    run: idx + 1,
    id: run.id,
    config: run.config,
    folds: activeFolds || [],
  }));

  const activeRun = runsForDisplay.find(r => r.id === activeRunId)?.run || 1;

  // Generate chart and summary data from API data
  const chartData = activeFolds ? activeFolds.map(fold => ({
    fold: fold.fold_number,
    [`Run ${activeRun}`]: fold.pnl_running,
  })) : [];

  const summaryData = runs.map((run, idx) => ({
    run: idx + 1,
    folds: run.metrics?.totalFolds || 0,
    return: run.metrics?.totalReturn || 0,
    pfLong: run.metrics?.profitFactorLong || 0,
    pfShort: run.metrics?.profitFactorShort || 0,
    pfDual: run.metrics?.profitFactorDual || 0,
    sigLong: run.metrics?.signalsLong || 0,
    sigShort: run.metrics?.signalsShort || 0,
    sigDual: run.metrics?.signalsDual || 0,
    totalTrades: run.metrics?.totalTrades || 0,
    hitRateLong: run.metrics?.hitRateLong || 0,
    hitRateShort: run.metrics?.hitRateShort || 0,
    hitRateTotal: run.metrics?.hitRateTotal || 0,
    runtime: run.metrics?.runtimeMs || 0,
  }));

  // Loading and error states
  if (runsLoading) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-4 w-96">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (runsError) {
    return (
      <div className="flex h-screen flex-col bg-background p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load walkforward runs. Please check your API connection.
            <br />
            <span className="text-sm">Error: {runsError.message}</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isRunning = createRunMutation.isPending;
  const activeRunObj = runs.find(r => r.id === activeRunId);
  const progress = activeRunObj?.status === 'running' ? 50 : 0; // Simplified progress

  return (
    <div className="flex h-screen flex-col bg-background">
      <SimulationHeader
        onStartSimulation={handleStartSimulation}
        onReset={handleReset}
        isRunning={isRunning}
        model={model}
        onModelChange={setModel}
      />

      {isRunning && (
        <div className="border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Status: Creating walkforward run...
            </span>
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Top-level Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-border bg-card px-4 flex-shrink-0">
          <TabsList>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="testModel">Test Model</TabsTrigger>
          </TabsList>
        </div>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex">
          <div className="flex flex-1 overflow-hidden">
            {/* Configuration Panel */}
            <div
              className={`relative border-r border-border transition-all duration-300 ${
                showConfig ? "w-80" : "w-0"
              }`}
            >
              {showConfig && (
                <ConfigurationPanel
              dataSource={dataSource}
              onDataSourceChange={setDataSource}
              target={target}
              onTargetChange={setTarget}
              selectedFeatures={selectedFeatures}
              onFeaturesChange={setSelectedFeatures}
              trainSize={trainSize}
              testSize={testSize}
              trainTestGap={trainTestGap}
              stepSize={stepSize}
              startFold={startFold}
              endFold={endFold}
              initialOffset={initialOffset}
              onTrainSizeChange={setTrainSize}
              onTestSizeChange={setTestSize}
              onTrainTestGapChange={setTrainTestGap}
              onStepSizeChange={setStepSize}
              onStartFoldChange={setStartFold}
              onEndFoldChange={setEndFold}
              onInitialOffsetChange={setInitialOffset}
              maxDepth={maxDepth}
              minChildWeight={minChildWeight}
              learningRate={learningRate}
              numRounds={numRounds}
              earlyStopping={earlyStopping}
              minRounds={minRounds}
              subsample={subsample}
              colsampleBytree={colsampleBytree}
              lambda={lambda}
              forceMinimumTraining={forceMinimumTraining}
              objective={objective}
              quantileAlpha={quantileAlpha}
              thresholdMethod={thresholdMethod}
              onMaxDepthChange={setMaxDepth}
              onMinChildWeightChange={setMinChildWeight}
              onLearningRateChange={setLearningRate}
              onNumRoundsChange={setNumRounds}
              onEarlyStoppingChange={setEarlyStopping}
              onMinRoundsChange={setMinRounds}
              onSubsampleChange={setSubsample}
              onColsampleBytreeChange={setColsampleBytree}
              onLambdaChange={setLambda}
              onForceMinimumTrainingChange={setForceMinimumTraining}
              onObjectiveChange={setObjective}
              onQuantileAlphaChange={setQuantileAlpha}
              onThresholdMethodChange={setThresholdMethod}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="absolute -right-3 top-1/2 z-10 h-12 w-6 -translate-y-1/2 rounded-l-none border border-border bg-card p-0"
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4">
              <div className="space-y-4">
                {chartData.length > 0 && <PerformanceChart data={chartData} />}
                {summaryData.length > 0 && <PerformanceSummary runs={summaryData} />}
                {runsForDisplay.length > 0 && (
                  <RunDetails
                    runs={runsForDisplay}
                    activeRun={activeRun}
                    onRunChange={(runNum) => {
                      const run = runsForDisplay.find(r => r.run === runNum);
                      if (run) setActiveRunId(run.id);
                    }}
                    onCloseRun={(runNum) => {
                      const run = runsForDisplay.find(r => r.run === runNum);
                      if (run) handleCloseRun(run.id);
                    }}
                    onExamineFold={handleExamineFold}
                  />
                )}
                {runsForDisplay.length === 0 && (
                  <div className="flex h-96 items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg font-medium">No simulation runs yet</p>
                      <p className="text-sm">Configure your parameters and click "Start Simulation" to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Test Model Tab */}
        <TabsContent value="testModel" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex">
          <div className="flex flex-1 overflow-hidden">
            {/* Fold Configuration Panel */}
            <div
              className={`relative border-r border-border transition-all duration-300 ${
                showFoldConfig ? "w-80" : "w-0"
              }`}
            >
              {showFoldConfig && (
                <>
                  {examinedFold ? (
                    <FoldConfigPanel
                      run={examinedFold.runId}
                      fold={examinedFold.fold.fold_number}
                      trainStart={foldTrainStart}
                      trainEnd={foldTrainEnd}
                      testStart={foldTestStart}
                      testEnd={foldTestEnd}
                      features={foldFeatures}
                      target={foldTarget}
                      tradingThreshold={foldTradingThreshold}
                      onTrainStartChange={setFoldTrainStart}
                      onTrainEndChange={setFoldTrainEnd}
                      onTestStartChange={setFoldTestStart}
                      onTestEndChange={setFoldTestEnd}
                      onFeaturesChange={setFoldFeatures}
                      onTargetChange={setFoldTarget}
                      onTradingThresholdChange={setFoldTradingThreshold}
                      onTrain={handleTrainFold}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground text-sm">
                      Select a fold to examine by clicking the "Examine" button in the Simulation tab
                    </div>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="absolute -right-3 top-1/2 z-10 h-12 w-6 -translate-y-1/2 rounded-l-none border border-border bg-card p-0"
                onClick={() => setShowFoldConfig(!showFoldConfig)}
              >
                {showFoldConfig ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>

            {/* Results Panel */}
            <div className="flex-1 p-4">
              {examinedFold ? (
                <FoldResults />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No fold selected for examination
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalkforwardDashboard;
