import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTab } from "./config/DataTab";
import { HyperparametersTab } from "./config/HyperparametersTab";
import { WalkForwardTab } from "./config/WalkForwardTab";
import { CopyPasteTab } from "./config/CopyPasteTab";

interface ConfigurationPanelProps {
  dataSource: string;
  onDataSourceChange: (value: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  trainSize: number;
  testSize: number;
  trainTestGap: number;
  stepSize: number;
  startFold: number;
  endFold: number;
  initialOffset: number;
  onTrainSizeChange: (value: number) => void;
  onTestSizeChange: (value: number) => void;
  onTrainTestGapChange: (value: number) => void;
  onStepSizeChange: (value: number) => void;
  onStartFoldChange: (value: number) => void;
  onEndFoldChange: (value: number) => void;
  onInitialOffsetChange: (value: number) => void;
  maxDepth: number;
  minChildWeight: number;
  learningRate: number;
  numRounds: number;
  earlyStopping: number;
  minRounds: number;
  subsample: number;
  colsampleBytree: number;
  lambda: number;
  forceMinimumTraining: boolean;
  objective: string;
  quantileAlpha: number;
  thresholdMethod: string;
  onMaxDepthChange: (value: number) => void;
  onMinChildWeightChange: (value: number) => void;
  onLearningRateChange: (value: number) => void;
  onNumRoundsChange: (value: number) => void;
  onEarlyStoppingChange: (value: number) => void;
  onMinRoundsChange: (value: number) => void;
  onSubsampleChange: (value: number) => void;
  onColsampleBytreeChange: (value: number) => void;
  onLambdaChange: (value: number) => void;
  onForceMinimumTrainingChange: (value: boolean) => void;
  onObjectiveChange: (value: string) => void;
  onQuantileAlphaChange: (value: number) => void;
  onThresholdMethodChange: (value: string) => void;
}

export const ConfigurationPanel = (props: ConfigurationPanelProps) => {
  const generateConfigText = () => {
    return `# Complete Configuration
# Model: XGBoost

# Features (${props.selectedFeatures.length})
${props.selectedFeatures.join(", ")}

# Target
${props.target}

# Walk-Forward Config
Train Size: ${props.trainSize}
Test Size: ${props.testSize}
Train-Test Gap: ${props.trainTestGap}
Fold Step: ${props.stepSize}
Start Fold: ${props.startFold}
End Fold: ${props.endFold}
Initial Offset: ${props.initialOffset}

# XGBoost Hyperparameters
learning_rate: ${props.learningRate}
max_depth: ${props.maxDepth}
min_child_weight: ${props.minChildWeight}
subsample: ${props.subsample}
colsample_bytree: ${props.colsampleBytree}
lambda: ${props.lambda}
num_boost_round: ${props.numRounds}
early_stopping_rounds: ${props.earlyStopping}
min_boost_rounds: ${props.minRounds}
force_minimum_training: ${props.forceMinimumTraining}
objective: ${props.objective}
quantile_alpha: ${props.quantileAlpha}
threshold_method: ${props.thresholdMethod}`;
  };

  const handlePasteConfig = (config: string) => {
    // Basic parsing logic - can be enhanced
    console.log("Parsing config:", config);
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="hyperparameters">Hyperparameters</TabsTrigger>
          <TabsTrigger value="walkforward">Walk-Forward</TabsTrigger>
          <TabsTrigger value="copypaste">Copy/Paste</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="data" className="m-0">
            <DataTab
              target={props.target}
              onTargetChange={props.onTargetChange}
              selectedFeatures={props.selectedFeatures}
              onFeaturesChange={props.onFeaturesChange}
            />
          </TabsContent>

          <TabsContent value="hyperparameters" className="m-0">
            <HyperparametersTab
              maxDepth={props.maxDepth}
              minChildWeight={props.minChildWeight}
              learningRate={props.learningRate}
              numRounds={props.numRounds}
              earlyStopping={props.earlyStopping}
              minRounds={props.minRounds}
              subsample={props.subsample}
              colsampleBytree={props.colsampleBytree}
              lambda={props.lambda}
              forceMinimumTraining={props.forceMinimumTraining}
              objective={props.objective}
              quantileAlpha={props.quantileAlpha}
              thresholdMethod={props.thresholdMethod}
              onMaxDepthChange={props.onMaxDepthChange}
              onMinChildWeightChange={props.onMinChildWeightChange}
              onLearningRateChange={props.onLearningRateChange}
              onNumRoundsChange={props.onNumRoundsChange}
              onEarlyStoppingChange={props.onEarlyStoppingChange}
              onMinRoundsChange={props.onMinRoundsChange}
              onSubsampleChange={props.onSubsampleChange}
              onColsampleBytreeChange={props.onColsampleBytreeChange}
              onLambdaChange={props.onLambdaChange}
              onForceMinimumTrainingChange={props.onForceMinimumTrainingChange}
              onObjectiveChange={props.onObjectiveChange}
              onQuantileAlphaChange={props.onQuantileAlphaChange}
              onThresholdMethodChange={props.onThresholdMethodChange}
            />
          </TabsContent>

          <TabsContent value="walkforward" className="m-0">
            <WalkForwardTab
              trainSize={props.trainSize}
              testSize={props.testSize}
              trainTestGap={props.trainTestGap}
              stepSize={props.stepSize}
              startFold={props.startFold}
              endFold={props.endFold}
              initialOffset={props.initialOffset}
              onTrainSizeChange={props.onTrainSizeChange}
              onTestSizeChange={props.onTestSizeChange}
              onTrainTestGapChange={props.onTrainTestGapChange}
              onStepSizeChange={props.onStepSizeChange}
              onStartFoldChange={props.onStartFoldChange}
              onEndFoldChange={props.onEndFoldChange}
              onInitialOffsetChange={props.onInitialOffsetChange}
            />
          </TabsContent>

          <TabsContent value="copypaste" className="m-0">
            <CopyPasteTab
              currentConfig={generateConfigText()}
              onPasteConfig={handlePasteConfig}
            />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};
