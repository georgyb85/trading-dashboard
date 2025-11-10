import { useState } from "react";
import { SimulationHeader } from "@/apps/walkforward/components/SimulationHeader";
import { LoadRunModal } from "@/apps/walkforward/components/LoadRunModal";
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
import type { Stage1RunDetail } from "@/lib/stage1/types";

const WalkforwardDashboard = () => {
  // Dataset and run selection
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [loadRunModalOpen, setLoadRunModalOpen] = useState(false);
  const [loadedRuns, setLoadedRuns] = useState<Stage1RunDetail[]>([]);
  const [activeRunIndex, setActiveRunIndex] = useState(0);

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
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(true);
  const [showFoldConfig, setShowFoldConfig] = useState(true);
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

  // Handle loading a saved run from Stage1
  const handleLoadRun = (run: Stage1RunDetail) => {
    console.log('[handleLoadRun] Raw run data:', run);
    console.log('[handleLoadRun] feature_columns type:', typeof run.feature_columns, run.feature_columns);
    console.log('[handleLoadRun] hyperparameters type:', typeof run.hyperparameters, run.hyperparameters);
    console.log('[handleLoadRun] First fold metrics type:', typeof run.folds?.[0]?.metrics, run.folds?.[0]?.metrics);

    // Defensive parsing - parse JSON strings if needed, otherwise use as-is
    let parsedRun = { ...run };

    // Parse feature_columns if it's a string
    if (typeof run.feature_columns === 'string') {
      try {
        parsedRun.feature_columns = JSON.parse(run.feature_columns);
        console.log('[handleLoadRun] Parsed feature_columns from string');
      } catch (e) {
        console.error('Failed to parse feature_columns:', e);
        parsedRun.feature_columns = [];
      }
    }

    // Parse hyperparameters if it's a string
    if (typeof run.hyperparameters === 'string') {
      try {
        parsedRun.hyperparameters = JSON.parse(run.hyperparameters as string);
        console.log('[handleLoadRun] Parsed hyperparameters from string');
      } catch (e) {
        console.error('Failed to parse hyperparameters:', e);
        parsedRun.hyperparameters = {};
      }
    }

    // Parse walk_config if it's a string
    if (typeof run.walk_config === 'string') {
      try {
        parsedRun.walk_config = JSON.parse(run.walk_config as string);
        console.log('[handleLoadRun] Parsed walk_config from string');
      } catch (e) {
        console.error('Failed to parse walk_config:', e);
        parsedRun.walk_config = {};
      }
    }

    // Parse summary_metrics if it's a string
    if (typeof run.summary_metrics === 'string') {
      try {
        parsedRun.summary_metrics = JSON.parse(run.summary_metrics as string);
        console.log('[handleLoadRun] Parsed summary_metrics from string');
      } catch (e) {
        console.error('Failed to parse summary_metrics:', e);
        parsedRun.summary_metrics = {};
      }
    }

    // Parse folds array and their nested JSON fields if needed
    if (parsedRun.folds && Array.isArray(parsedRun.folds)) {
      parsedRun.folds = parsedRun.folds.map((fold, idx) => {
        const parsedFold = { ...fold };

        // Parse fold metrics if it's a string
        if (typeof fold.metrics === 'string') {
          try {
            parsedFold.metrics = JSON.parse(fold.metrics as string);
            if (idx === 0) console.log('[handleLoadRun] Parsed fold metrics from string');
          } catch (e) {
            console.error('Failed to parse fold metrics:', e);
            parsedFold.metrics = {};
          }
        }

        // Parse fold thresholds if it's a string
        if (typeof fold.thresholds === 'string') {
          try {
            parsedFold.thresholds = JSON.parse(fold.thresholds as string);
            if (idx === 0) console.log('[handleLoadRun] Parsed fold thresholds from string');
          } catch (e) {
            console.error('Failed to parse fold thresholds:', e);
            parsedFold.thresholds = {};
          }
        }

        return parsedFold;
      });
    }

    console.log('[handleLoadRun] Final parsed run:', parsedRun);
    console.log('[handleLoadRun] First fold after parsing:', parsedRun.folds?.[0]);
    console.log('[handleLoadRun] Total folds in array:', parsedRun.folds?.length);
    console.log('[handleLoadRun] Summary metrics folds:', parsedRun.summary_metrics?.folds);
    console.log('[handleLoadRun] Last fold in array:', parsedRun.folds?.[parsedRun.folds.length - 1]);

    // Update selected features based on the loaded run's features
    if (parsedRun.feature_columns && Array.isArray(parsedRun.feature_columns)) {
      setSelectedFeatures(parsedRun.feature_columns);
      console.log('[handleLoadRun] Updated selected features:', parsedRun.feature_columns);
    }

    // Update other configuration fields from the run
    if (parsedRun.target_column) {
      setTarget(parsedRun.target_column);
    }

    // Check if run already loaded
    const existingIndex = loadedRuns.findIndex(r => r.run_id === parsedRun.run_id);

    if (existingIndex >= 0) {
      setActiveRunIndex(existingIndex);
      toast({
        title: "Run Already Loaded",
        description: `Switched to existing run ${parsedRun.run_id.slice(0, 8)}...`,
      });
    } else {
      setLoadedRuns(prev => [...prev, parsedRun]);
      setActiveRunIndex(loadedRuns.length);
      toast({
        title: "Run Loaded Successfully",
        description: `Loaded run ${parsedRun.run_id.slice(0, 8)}... with ${parsedRun.folds?.length ?? 0} folds`,
      });
    }
  };

  // Handle starting a simulation (demo mode for now)
  const handleStartSimulation = () => {
    toast({
      title: "Demo Mode",
      description: "Start Simulation is currently disabled. Please use 'Load Saved Run' to view existing results.",
      variant: "default",
    });
  };

  // Handle reset
  const handleReset = () => {
    setLoadedRuns([]);
    setActiveRunIndex(0);
    setExaminedFold(null);
    toast({
      title: "Reset Complete",
      description: "All loaded runs have been cleared.",
    });
  };

  // Handle closing a run
  const handleCloseRun = (runIndex: number) => {
    const updatedRuns = loadedRuns.filter((_, index) => index !== runIndex);
    setLoadedRuns(updatedRuns);

    if (updatedRuns.length > 0) {
      setActiveRunIndex(Math.min(runIndex, updatedRuns.length - 1));
    } else {
      setActiveRunIndex(0);
    }
  };

  // Handle examining a fold
  const handleExamineFold = (runIndex: number, fold: any) => {
    setExaminedFold({ runIndex, fold });
    setFoldTrainStart(fold.train_start_idx.toString());
    setFoldTrainEnd(fold.train_end_idx.toString());
    setFoldTestStart(fold.test_start_idx.toString());
    setFoldTestEnd(fold.test_end_idx.toString());

    const currentRun = loadedRuns[runIndex];
    if (currentRun) {
      setFoldFeatures(currentRun.feature_columns ?? []);
      setFoldTarget(currentRun.target_column ?? "");
      setFoldTradingThreshold((fold.thresholds?.prediction_scaled ?? 0).toString());
    }
    setViewMode("testModel");
  };

  const handleTrainFold = () => {
    toast({
      title: "Training Started",
      description: "Model training and testing in progress...",
    });
  };

  // Generate chart data from Stage1 runs
  const chartData = loadedRuns.length > 0
    ? loadedRuns[activeRunIndex]?.folds?.map((fold) => {
        const runningSum = fold.metrics?.running_sum ?? 0;
        const runningDual = fold.metrics?.running_sum_dual ?? runningSum;
        const runningShort = fold.metrics?.running_sum_short ?? 0;

        return {
          fold: fold.fold_number,
          [`Run ${activeRunIndex + 1}`]: runningSum,
          runningLong: runningSum,
          runningDual: runningDual,
          runningShort: runningShort,
        };
      }) ?? []
    : [];

  // Generate summary data from Stage1 runs
  const summaryData = loadedRuns.map((run, index) => {
    const folds = run.folds ?? [];

    // Debug: log first fold metrics to see available fields
    if (folds.length > 0 && index === 0) {
      console.log('[summaryData] First fold metrics fields:', Object.keys(folds[0].metrics || {}));
      console.log('[summaryData] First fold metrics sample:', folds[0].metrics);
    }

    // Aggregate metrics across all folds
    const totalReturn = folds.reduce((sum, fold) => sum + (fold.metrics?.sum ?? 0), 0);
    const totalSignals = folds.reduce((sum, fold) => sum + (fold.metrics?.n_signals ?? 0), 0);
    const totalSignalsShort = folds.reduce((sum, fold) => sum + (fold.metrics?.n_short_signals ?? 0), 0);
    const totalSignalsLong = totalSignals - totalSignalsShort; // Calculate long signals

    // Calculate hit rates separately for long and short
    const hitRatesLong = folds.map(f => f.metrics?.hit_rate ?? 0).filter(h => h > 0);
    const hitRatesShort = folds.map(f => f.metrics?.short_hit_rate ?? 0).filter(h => h > 0);

    const avgHitRateLong = hitRatesLong.length > 0
      ? hitRatesLong.reduce((a, b) => a + b, 0) / hitRatesLong.length
      : 0;

    const avgHitRateShort = hitRatesShort.length > 0
      ? hitRatesShort.reduce((a, b) => a + b, 0) / hitRatesShort.length
      : 0;

    // Calculate overall hit rate (weighted by signal counts)
    const totalWins = folds.reduce((sum, fold) => {
      const wins = (fold.metrics?.n_signals ?? 0) * (fold.metrics?.hit_rate ?? 0);
      return sum + wins;
    }, 0);
    const avgHitRateTotal = totalSignals > 0 ? totalWins / totalSignals : 0;

    // Calculate profit factors from last fold's running metrics
    const lastFold = folds[folds.length - 1];
    const pfTest = lastFold?.metrics?.profit_factor_test ?? 0;
    const pfTrain = lastFold?.metrics?.profit_factor_train ?? 0;
    const pfShortTest = lastFold?.metrics?.profit_factor_short_test ?? 0;
    const pfShortTrain = lastFold?.metrics?.profit_factor_short_train ?? 0;

    console.log('[summaryData] Run', index + 1, 'calculations:', {
      totalSignals,
      totalSignalsLong,
      totalSignalsShort,
      avgHitRateLong,
      avgHitRateShort,
      avgHitRateTotal,
      pfTest,
      pfTrain
    });

    return {
      run: index + 1,
      folds: folds.length,
      return: totalReturn,
      pfLong: pfTest, // Using profit_factor_test as general PF
      pfShort: pfShortTest,
      pfDual: pfTest, // Assuming test PF represents dual strategy
      sigLong: totalSignalsLong,
      sigShort: totalSignalsShort,
      sigDual: totalSignals,
      totalTrades: totalSignals,
      hitRateLong: avgHitRateLong * 100,
      hitRateShort: avgHitRateShort * 100,
      hitRateTotal: avgHitRateTotal * 100,
      runtime: run.duration_ms ? Math.round(run.duration_ms / 1000) : 0, // Convert ms to seconds
    };
  });

  // Convert Stage1 runs to the format expected by RunDetails
  const runsForDetails = loadedRuns.map((run, index) => ({
    run: index + 1,
    run_id: run.run_id,
    config: {
      ...(run.hyperparameters ?? {}),
      ...(run.walk_config ?? {}),
      model,
      dataSource: run.dataset_slug ?? "",
      target: run.target_column ?? "",
      features: run.feature_columns ?? [],
    },
    folds: (run.folds ?? []).map(fold => {
      // Calculate long signals (total - short)
      const nSignals = fold.metrics?.n_signals ?? 0;
      const nShortSignals = fold.metrics?.n_short_signals ?? 0;
      const nLongSignals = nSignals - nShortSignals;

      return {
        fold: fold.fold_number,
        iter: fold.best_iteration ?? 0,
        signalsLong: nLongSignals,
        signalsShort: nShortSignals,
        signalsTotal: nSignals,
        hitRateLong: (fold.metrics?.hit_rate ?? 0) * 100,
        hitRateShort: (fold.metrics?.short_hit_rate ?? 0) * 100,
        hitRateTotal: (fold.metrics?.hit_rate ?? 0) * 100, // Overall hit rate
        sum: fold.metrics?.sum ?? 0,
        running: fold.metrics?.running_sum ?? 0,
        pfTrain: fold.metrics?.profit_factor_train ?? 0,
        pfLong: fold.metrics?.profit_factor_test ?? 0,
        pfShort: fold.metrics?.profit_factor_short_test ?? 0,
        pfDual: fold.metrics?.profit_factor_test ?? 0,
        trainStart: fold.train_start_idx.toString(),
        trainEnd: fold.train_end_idx.toString(),
        testStart: fold.test_start_idx.toString(),
        testEnd: fold.test_end_idx.toString(),
        train_start_idx: fold.train_start_idx,
        train_end_idx: fold.train_end_idx,
        test_start_idx: fold.test_start_idx,
        test_end_idx: fold.test_end_idx,
        samples_train: fold.samples_train,
        samples_test: fold.samples_test,
        best_score: fold.best_score,
        thresholds: fold.thresholds,
        metrics: fold.metrics,
      };
    }),
  }));

  return (
    <div className="flex h-full flex-col bg-background">
      <SimulationHeader
        onStartSimulation={handleStartSimulation}
        onReset={handleReset}
        onLoadRun={() => setLoadRunModalOpen(true)}
        isRunning={isRunning}
        model={model}
        onModelChange={setModel}
        selectedDataset={selectedDataset}
        onDatasetChange={setSelectedDataset}
      />

      {isRunning && (
        <div className="border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Status: Training fold {Math.floor(progress * 1.4)}/140...
            </span>
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      <LoadRunModal
        open={loadRunModalOpen}
        onOpenChange={setLoadRunModalOpen}
        datasetId={selectedDataset}
        onLoadRun={handleLoadRun}
      />

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
                {runsForDetails.length > 0 && (
                  <RunDetails
                    runs={runsForDetails}
                    activeRun={activeRunIndex + 1}
                    onRunChange={(runNumber) => setActiveRunIndex(runNumber - 1)}
                    onCloseRun={(runNumber) => handleCloseRun(runNumber - 1)}
                    onExamineFold={handleExamineFold}
                  />
                )}
                {runsForDetails.length === 0 && (
                  <div className="flex h-96 items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg font-medium">No runs loaded yet</p>
                      <p className="text-sm">Select a dataset and click "Load Saved Run" to begin</p>
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
                      run={examinedFold.runIndex + 1}
                      fold={examinedFold.fold.fold}
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
