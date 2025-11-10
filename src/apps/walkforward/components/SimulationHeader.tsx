import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, RotateCcw, FolderOpen } from "lucide-react";
import { useStage1Datasets } from "@/apps/walkforward/lib/hooks";

interface SimulationHeaderProps {
  onStartSimulation: () => void;
  onReset: () => void;
  onLoadRun: () => void;
  isRunning: boolean;
  model: string;
  onModelChange: (value: string) => void;
  selectedDataset: string | null;
  onDatasetChange: (datasetId: string) => void;
}

export const SimulationHeader = ({
  onStartSimulation,
  onReset,
  onLoadRun,
  isRunning,
  model,
  onModelChange,
  selectedDataset,
  onDatasetChange,
}: SimulationHeaderProps) => {
  const { data: datasets, isLoading: datasetsLoading } = useStage1Datasets();

  return (
    <div className="border-b border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Dataset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Dataset:</label>
          {datasetsLoading ? (
            <Skeleton className="h-9 w-[220px]" />
          ) : (
            <Select value={selectedDataset || undefined} onValueChange={onDatasetChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((dataset) => (
                  <SelectItem key={dataset.dataset_id} value={dataset.dataset_id}>
                    {dataset.dataset_slug} ({dataset.symbol}) - {dataset.indicator_row_count} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Model:</label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger className="w-[180px]">
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
          <Select defaultValue="walkforward">
            <SelectTrigger className="w-[180px]">
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
            onClick={onLoadRun}
            variant="outline"
            disabled={!selectedDataset || isRunning}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Load Saved Run
          </Button>
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
