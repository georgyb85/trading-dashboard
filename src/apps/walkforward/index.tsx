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

interface WalkforwardDashboardProps {
  selectedDataset?: string | null;
  onDatasetChange?: (datasetId: string) => void;
}

const WalkforwardDashboard = ({
  selectedDataset = null,
  onDatasetChange
}: WalkforwardDashboardProps) => {
  // Run selection
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

  // Generate chart data from ALL loaded runs
  const chartData = loadedRuns.length > 0
    ? (() => {
        // Get the maximum number of folds across all runs
        const maxFolds = Math.max(...loadedRuns.map(run => run.folds?.length ?? 0));

        // Create data points for each fold
        const data: Array<{ fold: number; [key: string]: number }> = [];

        for (let foldNum = 0; foldNum < maxFolds; foldNum++) {
          const dataPoint: { fold: number; [key: string]: number } = { fold: foldNum };

          // Add data from each run for this fold
          loadedRuns.forEach((run, runIndex) => {
            const fold = run.folds?.[foldNum];
            if (fold) {
              // According to guide:
              // running_sum = cumulative P&L for LONG signals only
              // running_sum_short = cumulative P&L for SHORT signals only
              // running_sum_dual = cumulative P&L for long + short combined
              const runningLong = fold.metrics?.running_sum ?? 0;
              const runningShort = fold.metrics?.running_sum_short ?? 0;
              const runningDual = fold.metrics?.running_sum_dual ?? 0;

              // Add entries for each strategy type
              dataPoint[`run${runIndex + 1}_dual`] = runningDual;
              dataPoint[`run${runIndex + 1}_long`] = runningLong;
              dataPoint[`run${runIndex + 1}_short`] = runningShort;
            }
          });

          data.push(dataPoint);
        }

        return data;
      })()
    : [];

  // Generate summary data from Stage1 runs
  const summaryData = loadedRuns.map((run, index) => {
    const folds = run.folds ?? [];

    // According to FoldPerformance_ReconstructionGuide.md aggregation formulas:
    // total_long_signals  = Σ fold.n_signals
    // total_short_signals = Σ fold.n_short_signals
    // total_signals       = total_long_signals + total_short_signals
    const totalSignalsLong = folds.reduce((sum, fold) => sum + (fold.metrics?.n_signals ?? 0), 0);
    const totalSignalsShort = folds.reduce((sum, fold) => sum + (fold.metrics?.n_short_signals ?? 0), 0);
    const totalSignals = totalSignalsLong + totalSignalsShort;

    // hit_rate_long = Σ (fold.hit_rate * fold.n_signals) / max(1, total_long_signals)
    // hit_rate_short = Σ (fold.short_hit_rate * fold.n_short_signals) / max(1, total_short_signals)
    const weightedLongHits = folds.reduce((sum, fold) => {
      const signals = fold.metrics?.n_signals ?? 0;
      const hitRate = fold.metrics?.hit_rate ?? 0;
      return sum + (hitRate * signals);
    }, 0);

    const weightedShortHits = folds.reduce((sum, fold) => {
      const signals = fold.metrics?.n_short_signals ?? 0;
      const hitRate = fold.metrics?.short_hit_rate ?? 0;
      return sum + (hitRate * signals);
    }, 0);

    const avgHitRateLong = totalSignalsLong > 0 ? weightedLongHits / totalSignalsLong : 0;
    const avgHitRateShort = totalSignalsShort > 0 ? weightedShortHits / totalSignalsShort : 0;

    // hit_rate_overall = (Σ fold.signal_wins + Σ fold.short_signal_wins) / max(1, total_signals)
    // Since we don't have signal_wins directly, use weighted calculation
    const totalHits = (totalSignalsLong * avgHitRateLong) + (totalSignalsShort * avgHitRateShort);
    const avgHitRateTotal = totalSignals > 0 ? totalHits / totalSignals : 0;

    // For profit factors, aggregate across all folds:
    // pf_long  = compute_pf(Σ fold.sum_wins, Σ fold.sum_losses)
    // pf_short = compute_pf(Σ fold.sum_short_wins, Σ fold.sum_short_losses)
    const totalSumWins = folds.reduce((sum, fold) => sum + (fold.metrics?.sum_wins ?? 0), 0);
    const totalSumLosses = folds.reduce((sum, fold) => sum + (fold.metrics?.sum_losses ?? 0), 0);
    const totalSumShortWins = folds.reduce((sum, fold) => sum + (fold.metrics?.sum_short_wins ?? 0), 0);
    const totalSumShortLosses = folds.reduce((sum, fold) => sum + (fold.metrics?.sum_short_losses ?? 0), 0);

    // Compute profit factors with epsilon guard
    const pfLong = totalSumLosses > 0 ? totalSumWins / totalSumLosses : (totalSumWins > 0 ? 999.0 : 0);
    const pfShort = totalSumShortLosses > 0 ? totalSumShortWins / totalSumShortLosses : (totalSumShortWins > 0 ? 999.0 : 0);
    const pfDual = (totalSumLosses + totalSumShortLosses) > 0
      ? (totalSumWins + totalSumShortWins) / (totalSumLosses + totalSumShortLosses)
      : ((totalSumWins + totalSumShortWins) > 0 ? 999.0 : 0);

    // Get the final running sums from the last fold
    const lastFold = folds[folds.length - 1];
    const totalReturn = lastFold?.metrics?.running_sum_dual ?? lastFold?.metrics?.running_sum ?? 0;

    return {
      run: index + 1,
      folds: folds.length,
      return: totalReturn,
      pfLong: pfLong,
      pfShort: pfShort,
      pfDual: pfDual,
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
      // According to FoldPerformance_ReconstructionGuide.md:
      // n_signals = number of LONG entries (NOT total)
      // n_short_signals = number of SHORT entries
      // Total = n_signals + n_short_signals
      const nLongSignals = fold.metrics?.n_signals ?? 0;
      const nShortSignals = fold.metrics?.n_short_signals ?? 0;
      const signalsTotal = nLongSignals + nShortSignals;

      // hit_rate = long win ratio
      // short_hit_rate = short win ratio
      const hitRateLong = (fold.metrics?.hit_rate ?? 0) * 100;
      const hitRateShort = (fold.metrics?.short_hit_rate ?? 0) * 100;

      // Calculate weighted hit rate for total
      let hitRateTotal = 0;
      if (signalsTotal > 0) {
        const longHits = nLongSignals * (hitRateLong / 100);
        const shortHits = nShortSignals * (hitRateShort / 100);
        hitRateTotal = ((longHits + shortHits) / signalsTotal) * 100;
      }

      // Running sums according to guide:
      // running_sum = cumulative P&L for LONG signals only
      // running_sum_short = cumulative P&L for SHORT signals only
      // running_sum_dual = cumulative P&L for long + short combined
      const runningLong = fold.metrics?.running_sum ?? 0;
      const runningShort = fold.metrics?.running_sum_short ?? 0;
      const runningDual = fold.metrics?.running_sum_dual ?? 0;

      // For the "Running" column in the table, use dual (combined)
      const displayRunning = runningDual || runningLong; // Use dual if available, else long

      // Sum is the fold's contribution (not cumulative)
      // signal_sum = sum of monetary P&L for each long trade in this fold
      // short_signal_sum = sum of monetary P&L for each short trade in this fold
      const sumLong = fold.metrics?.signal_sum ?? fold.metrics?.sum ?? 0;
      const sumShort = fold.metrics?.short_signal_sum ?? 0;
      const sumTotal = sumLong + sumShort;

      // Profit factors according to guide:
      // profit_factor_test = PF for long side
      // profit_factor_short_test = PF for short side
      // Dual PF uses combined wins/losses
      const pfLong = fold.metrics?.profit_factor_test ?? 0;
      const pfShort = fold.metrics?.profit_factor_short_test ?? 0;

      // For dual PF, check if there's a specific dual field, otherwise calculate
      let pfDual = fold.metrics?.profit_factor_dual ?? 0;
      if (!pfDual && (pfLong > 0 || pfShort > 0)) {
        // If we have sum_wins/sum_losses, we could calculate it, but for now use the max
        pfDual = Math.max(pfLong, pfShort);
      }

      return {
        fold: fold.fold_number,
        iter: fold.best_iteration ?? 0,
        signalsLong: nLongSignals,
        signalsShort: nShortSignals,
        signalsTotal: signalsTotal,
        hitRateLong: nLongSignals > 0 ? hitRateLong : 0,
        hitRateShort: nShortSignals > 0 ? hitRateShort : 0,
        hitRateTotal: signalsTotal > 0 ? hitRateTotal : 0,
        sum: sumTotal,
        running: displayRunning,
        pfTrain: fold.metrics?.profit_factor_train ?? 0,
        pfLong: pfLong,
        pfShort: pfShort,
        pfDual: pfDual,
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
