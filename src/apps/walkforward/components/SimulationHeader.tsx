import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, RotateCcw, FolderOpen } from "lucide-react";

interface SimulationHeaderProps {
  onStartSimulation: () => void;
  onReset: () => void;
  onLoadRun: () => void;
  isRunning: boolean;
  model: string;
  onModelChange: (value: string) => void;
  selectedDataset: string | null;
}

export const SimulationHeader = ({
  onStartSimulation,
  onReset,
  onLoadRun,
  isRunning,
  model,
  onModelChange,
  selectedDataset,
}: SimulationHeaderProps) => {

  return (
    <div className="border-b border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Load Saved Run Button - moved to the left */}
        <Button
          onClick={onLoadRun}
          variant="outline"
          disabled={isRunning}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Load Saved Run
        </Button>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Model:</label>
          <Select value={model} onValueChange={onModelChange} disabled>
            <SelectTrigger className="w-[180px]" disabled>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xgboost">XGBoost</SelectItem>
              <SelectItem value="lightgbm">LightGBM</SelectItem>
              <SelectItem value="catboost">CatBoost</SelectItem>
              <SelectItem value="randomforest">Random Forest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Mode:</label>
          <Select defaultValue="walkforward" disabled>
            <SelectTrigger className="w-[180px]" disabled>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walkforward">Walk-Forward</SelectItem>
              <SelectItem value="crossvalidation">Cross Validation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            onClick={onStartSimulation}
            disabled={isRunning}
            className="bg-success hover:bg-success/90"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Simulation
          </Button>
          <Button onClick={onReset} variant="outline" disabled={isRunning}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
