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
import { generateMockChartData, generateMockSummary, generateMockFolds } from "@/apps/walkforward/lib/mockData";
import { toast } from "@/hooks/use-toast";

const WalkforwardDashboard = () => {
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
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(true);
  const [showFoldConfig, setShowFoldConfig] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [activeRun, setActiveRun] = useState(1);
  const [chartData, setChartData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any[]>([]);
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

  useEffect(() => {
    // Initialize with mock data for Run 1
    const initialRun = {
      run: 1,
      config: {
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
      },
      folds: generateMockFolds(140),
    };
    setRuns([initialRun]);
    setChartData(generateMockChartData(140, 1));
    setSummaryData(generateMockSummary(1));
  }, []);

  const handleStartSimulation = () => {
    setIsRunning(true);
    setProgress(0);

    const newRunNumber = runs.length + 1;
    const numFolds = Math.floor((1000 - trainSize) / stepSize);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);

          // Add new run
          const newRun = {
            run: newRunNumber,
            config: {
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
            },
            folds: generateMockFolds(numFolds),
          };

          setRuns((prev) => [...prev, newRun]);
          setActiveRun(newRunNumber);
          setChartData(generateMockChartData(numFolds, newRunNumber));
          setSummaryData(generateMockSummary(newRunNumber));

          toast({
            title: "Simulation Complete",
            description: `Run ${newRunNumber} completed successfully with ${numFolds} folds.`,
          });

          return 100;
        }
        return prev + 1;
      });
    }, 30);
  };

  const handleReset = () => {
    setRuns([]);
    setChartData([]);
    setSummaryData([]);
    setProgress(0);
    toast({
      title: "Reset Complete",
      description: "All simulation data has been cleared.",
    });
  };

  const handleCloseRun = (runNumber: number) => {
    const updatedRuns = runs.filter((r) => r.run !== runNumber);
    setRuns(updatedRuns);

    if (updatedRuns.length > 0) {
      setActiveRun(updatedRuns[updatedRuns.length - 1].run);
      setChartData(generateMockChartData(140, updatedRuns.length));
      setSummaryData(generateMockSummary(updatedRuns.length));
    } else {
      setActiveRun(1);
      setChartData([]);
      setSummaryData([]);
    }
  };

  const handleExamineFold = (run: number, fold: any) => {
    setExaminedFold({ run, fold });
    setFoldTrainStart(fold.trainStart);
    setFoldTrainEnd(fold.trainEnd);
    setFoldTestStart(fold.testStart);
    setFoldTestEnd(fold.testEnd);
    const currentRun = runs.find((r) => r.run === run);
    if (currentRun) {
      setFoldFeatures(currentRun.config.features);
      setFoldTarget(currentRun.config.target);
    }
    setViewMode("testModel");
  };

  const handleTrainFold = () => {
    toast({
      title: "Training Started",
      description: "Model training and testing in progress...",
    });
  };

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
              Status: Training fold {Math.floor(progress * 1.4)}/140...
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
                {runs.length > 0 && (
                  <RunDetails
                    runs={runs}
                    activeRun={activeRun}
                    onRunChange={setActiveRun}
                    onCloseRun={handleCloseRun}
                    onExamineFold={handleExamineFold}
                  />
                )}
                {runs.length === 0 && (
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
                      run={examinedFold.run}
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
