import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface FoldConfigPanelProps {
  run: number;
  fold: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  features: string[];
  target: string;
  tradingThreshold: string;
  onTrainStartChange: (value: string) => void;
  onTrainEndChange: (value: string) => void;
  onTestStartChange: (value: string) => void;
  onTestEndChange: (value: string) => void;
  onFeaturesChange: (features: string[]) => void;
  onTargetChange: (target: string) => void;
  onTradingThresholdChange: (value: string) => void;
  onTrain: () => void;
}

const AVAILABLE_FEATURES = [
  "MOCX_L", "MOCX_M", "MOCX_S", "AROVOL_DIFF_S", "AROVOL_DOWNL_L",
  "AROVOL_DOWNL_M", "AROVOL_DOWNL_S", "AROVOL_UP_L", "AROVOL_UP_M",
  "AROVOL_UP_S", "ATR_RATIO_L", "ATR_RATIO_M", "ATR_RATIO_S"
];

const AVAILABLE_TARGETS = ["TGT_i16", "TGT_i15", "TGT_G55"];

export const FoldConfigPanel = ({
  run,
  fold,
  trainStart,
  trainEnd,
  testStart,
  testEnd,
  features,
  target,
  tradingThreshold,
  onTrainStartChange,
  onTrainEndChange,
  onTestStartChange,
  onTestEndChange,
  onFeaturesChange,
  onTargetChange,
  onTradingThresholdChange,
  onTrain,
}: FoldConfigPanelProps) => {
  const toggleFeature = (feature: string) => {
    if (features.includes(feature)) {
      onFeaturesChange(features.filter((f) => f !== feature));
    } else {
      onFeaturesChange([...features, feature]);
    }
  };

  const selectAllFeatures = () => onFeaturesChange([...AVAILABLE_FEATURES]);
  const clearAllFeatures = () => onFeaturesChange([]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Configuration from: Run {run} – Fold {fold}
          </h3>
          <Button variant="outline" size="sm">Clear</Button>
        </div>

        {/* Data Range */}
        <Card className="p-3">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold mb-2">Training Data Range:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Row</Label>
                  <Input 
                    value={trainStart} 
                    onChange={(e) => onTrainStartChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Row</Label>
                  <Input 
                    value={trainEnd} 
                    onChange={(e) => onTrainEndChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold mb-2">Test Data Range:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Row</Label>
                  <Input 
                    value={testStart} 
                    onChange={(e) => onTestStartChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Row</Label>
                  <Input 
                    value={testEnd} 
                    onChange={(e) => onTestEndChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Feature and Target Selection */}
        <Card className="p-3">
          <h4 className="text-xs font-semibold mb-2">Feature and Target Selection:</h4>
          <div className="space-y-3">
            {/* Features */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Features:</Label>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={selectAllFeatures} className="text-xs h-6 px-2">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllFeatures} className="text-xs h-6 px-2">
                  Clear All
                </Button>
              </div>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-1">
                  {AVAILABLE_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox 
                        id={feature}
                        checked={features.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      <label htmlFor={feature} className="text-xs cursor-pointer">
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Selected: {features.length} features
              </p>
            </div>

            {/* Targets */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target:</Label>
              <ScrollArea className="h-20 border rounded-md p-2">
                <div className="space-y-1">
                  {AVAILABLE_TARGETS.map((t) => (
                    <div key={t} className="flex items-center space-x-2">
                      <input 
                        type="radio"
                        id={t}
                        name="target"
                        checked={target === t}
                        onChange={() => onTargetChange(t)}
                        className="cursor-pointer"
                      />
                      <label htmlFor={t} className="text-xs cursor-pointer">
                        {t}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Target: {target}
              </p>
            </div>
          </div>
        </Card>

        {/* Trading Threshold */}
        <Card className="p-3">
          <div className="space-y-2">
            <Label className="text-xs">Trading Threshold:</Label>
            <div className="flex gap-2">
              <Input 
                value={tradingThreshold} 
                onChange={(e) => onTradingThresholdChange(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Button variant="outline" size="sm" className="h-8 text-xs px-3">
                Auto
              </Button>
            </div>
          </div>
        </Card>

        <Button className="w-full" onClick={onTrain}>
          Train & Test Model
        </Button>
      </div>
    </ScrollArea>
  );
};
