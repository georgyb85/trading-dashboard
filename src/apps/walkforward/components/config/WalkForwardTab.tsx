import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface WalkForwardTabProps {
  trainSize: number;
  testSize: number;
  trainTestGap: number;
  stepSize: number;
  startFold: number;
  endFold: number;
  initialOffset: number;
  onTrainSizeChange: (v: number) => void;
  onTestSizeChange: (v: number) => void;
  onTrainTestGapChange: (v: number) => void;
  onStepSizeChange: (v: number) => void;
  onStartFoldChange: (v: number) => void;
  onEndFoldChange: (v: number) => void;
  onInitialOffsetChange: (v: number) => void;
}

export const WalkForwardTab = (props: WalkForwardTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Train Size</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={props.trainSize}
              onChange={(e) => props.onTrainSizeChange(Number(e.target.value) || 20)}
              className="w-20 h-7 text-sm font-medium"
              min={20}
              max={1000}
              step={10}
            />
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        </div>
        <Slider
          value={[props.trainSize]}
          onValueChange={([v]) => props.onTrainSizeChange(v)}
          min={20}
          max={1000}
          step={10}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Test Size</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={props.testSize}
              onChange={(e) => props.onTestSizeChange(Number(e.target.value) || 1)}
              className="w-20 h-7 text-sm font-medium"
              min={1}
              max={100}
              step={1}
            />
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        </div>
        <Slider
          value={[props.testSize]}
          onValueChange={([v]) => props.onTestSizeChange(v)}
          min={1}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Train-Test Gap</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={props.trainTestGap}
              onChange={(e) => props.onTrainTestGapChange(Number(e.target.value) || 0)}
              className="w-20 h-7 text-sm font-medium"
              min={0}
              max={50}
              step={1}
            />
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        </div>
        <Slider
          value={[props.trainTestGap]}
          onValueChange={([v]) => props.onTrainTestGapChange(v)}
          min={0}
          max={50}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Fold Step</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={props.stepSize}
              onChange={(e) => props.onStepSizeChange(Number(e.target.value) || 1)}
              className="w-20 h-7 text-sm font-medium"
              min={1}
              max={100}
              step={1}
            />
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        </div>
        <Slider
          value={[props.stepSize]}
          onValueChange={([v]) => props.onStepSizeChange(v)}
          min={1}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Start Fold</Label>
          <Input
            type="number"
            value={props.startFold}
            onChange={(e) => props.onStartFoldChange(Number(e.target.value) || 0)}
            className="w-20 h-7 text-sm font-medium"
            min={0}
            max={100}
            step={1}
          />
        </div>
        <Slider
          value={[props.startFold]}
          onValueChange={([v]) => props.onStartFoldChange(v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">End Fold</Label>
          <Input
            type="number"
            value={props.endFold === -1 ? 0 : props.endFold}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              props.onEndFoldChange(val === 0 ? -1 : val);
            }}
            className="w-20 h-7 text-sm font-medium"
            min={0}
            max={200}
            step={1}
            placeholder="Last"
          />
        </div>
        <Slider
          value={[props.endFold === -1 ? 0 : props.endFold]}
          onValueChange={([v]) => props.onEndFoldChange(v === 0 ? -1 : v)}
          min={0}
          max={200}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Initial Offset</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={props.initialOffset}
              onChange={(e) => props.onInitialOffsetChange(Number(e.target.value) || 0)}
              className="w-20 h-7 text-sm font-medium"
              min={0}
              max={500}
              step={10}
            />
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        </div>
        <Slider
          value={[props.initialOffset]}
          onValueChange={([v]) => props.onInitialOffsetChange(v)}
          min={0}
          max={500}
          step={10}
        />
      </div>
    </div>
  );
};
