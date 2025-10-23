import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface HyperparametersTabProps {
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
  onMaxDepthChange: (v: number) => void;
  onMinChildWeightChange: (v: number) => void;
  onLearningRateChange: (v: number) => void;
  onNumRoundsChange: (v: number) => void;
  onEarlyStoppingChange: (v: number) => void;
  onMinRoundsChange: (v: number) => void;
  onSubsampleChange: (v: number) => void;
  onColsampleBytreeChange: (v: number) => void;
  onLambdaChange: (v: number) => void;
  onForceMinimumTrainingChange: (v: boolean) => void;
  onObjectiveChange: (v: string) => void;
  onQuantileAlphaChange: (v: number) => void;
  onThresholdMethodChange: (v: string) => void;
}

export const HyperparametersTab = (props: HyperparametersTabProps) => {
  const [openSections, setOpenSections] = useState({
    tree: true,
    learning: true,
    regularization: false,
    loss: false,
    threshold: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-3">
      {/* Tree Parameters */}
      <Collapsible open={openSections.tree} onOpenChange={() => toggleSection("tree")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
          <Label className="text-sm font-bold text-foreground cursor-pointer">Tree Parameters</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.tree ? "" : "-rotate-90"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Max Depth</Label>
              <Input
                type="number"
                value={props.maxDepth}
                onChange={(e) => props.onMaxDepthChange(Number(e.target.value) || 1)}
                className="w-20 h-7 text-sm font-medium"
                min={1}
                max={20}
                step={1}
              />
            </div>
            <Slider
              value={[props.maxDepth]}
              onValueChange={([v]) => props.onMaxDepthChange(v)}
              min={1}
              max={20}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Min Child Weight</Label>
              <Input
                type="number"
                value={props.minChildWeight}
                onChange={(e) => props.onMinChildWeightChange(Number(e.target.value) || 0)}
                className="w-20 h-7 text-sm font-medium"
                min={0}
                max={100}
                step={0.1}
              />
            </div>
            <Slider
              value={[props.minChildWeight]}
              onValueChange={([v]) => props.onMinChildWeightChange(v)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Learning Parameters */}
      <Collapsible open={openSections.learning} onOpenChange={() => toggleSection("learning")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
          <Label className="text-sm font-bold text-foreground cursor-pointer">Learning Parameters</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.learning ? "" : "-rotate-90"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Learning Rate</Label>
              <Input
                type="number"
                value={props.learningRate.toFixed(4)}
                onChange={(e) => props.onLearningRateChange(Number(e.target.value) || 0.0001)}
                className="w-24 h-7 text-sm font-medium"
                min={0.0001}
                max={0.1}
                step={0.0001}
              />
            </div>
            <Slider
              value={[props.learningRate * 10000]}
              onValueChange={([v]) => props.onLearningRateChange(v / 10000)}
              min={1}
              max={1000}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Num Rounds</Label>
              <Input
                type="number"
                value={props.numRounds}
                onChange={(e) => props.onNumRoundsChange(Number(e.target.value) || 10)}
                className="w-20 h-7 text-sm font-medium"
                min={10}
                max={5000}
                step={10}
              />
            </div>
            <Slider
              value={[props.numRounds]}
              onValueChange={([v]) => props.onNumRoundsChange(v)}
              min={10}
              max={5000}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Early Stopping</Label>
              <Input
                type="number"
                value={props.earlyStopping}
                onChange={(e) => props.onEarlyStoppingChange(Number(e.target.value) || 0)}
                className="w-20 h-7 text-sm font-medium"
                min={0}
                max={1000}
                step={10}
              />
            </div>
            <Slider
              value={[props.earlyStopping]}
              onValueChange={([v]) => props.onEarlyStoppingChange(v)}
              min={0}
              max={1000}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Min Rounds</Label>
              <Input
                type="number"
                value={props.minRounds}
                onChange={(e) => props.onMinRoundsChange(Number(e.target.value) || 10)}
                className="w-20 h-7 text-sm font-medium"
                min={10}
                max={1000}
                step={10}
              />
            </div>
            <Slider
              value={[props.minRounds]}
              onValueChange={([v]) => props.onMinRoundsChange(v)}
              min={10}
              max={1000}
              step={10}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="forceMin"
              checked={props.forceMinimumTraining}
              onCheckedChange={props.onForceMinimumTrainingChange}
            />
            <Label htmlFor="forceMin" className="text-sm font-medium cursor-pointer">
              Force Minimum Training
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Regularization */}
      <Collapsible open={openSections.regularization} onOpenChange={() => toggleSection("regularization")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
          <Label className="text-sm font-bold text-foreground cursor-pointer">Regularization</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.regularization ? "" : "-rotate-90"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Subsample</Label>
              <Input
                type="number"
                value={props.subsample.toFixed(2)}
                onChange={(e) => props.onSubsampleChange(Number(e.target.value) || 0.1)}
                className="w-20 h-7 text-sm font-medium"
                min={0.1}
                max={1}
                step={0.01}
              />
            </div>
            <Slider
              value={[props.subsample * 100]}
              onValueChange={([v]) => props.onSubsampleChange(v / 100)}
              min={10}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Col Sample</Label>
              <Input
                type="number"
                value={props.colsampleBytree.toFixed(2)}
                onChange={(e) => props.onColsampleBytreeChange(Number(e.target.value) || 0.1)}
                className="w-20 h-7 text-sm font-medium"
                min={0.1}
                max={1}
                step={0.01}
              />
            </div>
            <Slider
              value={[props.colsampleBytree * 100]}
              onValueChange={([v]) => props.onColsampleBytreeChange(v / 100)}
              min={10}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <Label className="text-sm font-semibold text-foreground">Lambda (L2)</Label>
              <Input
                type="number"
                value={props.lambda.toFixed(2)}
                onChange={(e) => props.onLambdaChange(Number(e.target.value) || 0)}
                className="w-20 h-7 text-sm font-medium"
                min={0}
                max={10}
                step={0.1}
              />
            </div>
            <Slider
              value={[props.lambda * 10]}
              onValueChange={([v]) => props.onLambdaChange(v / 10)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Loss Function */}
      <Collapsible open={openSections.loss} onOpenChange={() => toggleSection("loss")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
          <Label className="text-sm font-bold text-foreground cursor-pointer">Loss Function</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.loss ? "" : "-rotate-90"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Objective</Label>
            <Select value={props.objective} onValueChange={props.onObjectiveChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reg:squarederror">Squared Error</SelectItem>
                <SelectItem value="reg:quantileerror">Quantile Error</SelectItem>
                <SelectItem value="reg:logistic">Logistic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {props.objective === "reg:quantileerror" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <Label className="text-sm font-semibold text-foreground">Quantile Alpha</Label>
                <Input
                  type="number"
                  value={props.quantileAlpha.toFixed(2)}
                  onChange={(e) => props.onQuantileAlphaChange(Number(e.target.value) || 0.01)}
                  className="w-20 h-7 text-sm font-medium"
                  min={0.01}
                  max={0.99}
                  step={0.01}
                />
              </div>
              <Slider
                value={[props.quantileAlpha * 100]}
                onValueChange={([v]) => props.onQuantileAlphaChange(v / 100)}
                min={1}
                max={99}
                step={1}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Trading Threshold */}
      <Collapsible open={openSections.threshold} onOpenChange={() => toggleSection("threshold")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md">
          <Label className="text-sm font-bold text-foreground cursor-pointer">Trading Threshold</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.threshold ? "" : "-rotate-90"}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Threshold Method</Label>
            <Select value={props.thresholdMethod} onValueChange={props.onThresholdMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OptimalROC">Optimal ROC (PF-based)</SelectItem>
                <SelectItem value="FixedQuantile">Fixed Quantile</SelectItem>
                <SelectItem value="AdaptiveStd">Adaptive Std Dev</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
