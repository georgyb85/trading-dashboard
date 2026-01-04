import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listExecutorConfigs } from "@/lib/stage1/client";
import type { Stage1ExecutorConfig } from "@/lib/stage1/types";
import { toast } from "@/hooks/use-toast";

interface LoadExecutorConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadConfig: (config: Stage1ExecutorConfig) => void;
}

export const LoadExecutorConfigModal = ({
  open,
  onOpenChange,
  onLoadConfig,
}: LoadExecutorConfigModalProps) => {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const {
    data: configs,
    isLoading,
    error,
  } = useQuery<Stage1ExecutorConfig[], Error>({
    queryKey: ["stage1", "executor_configs"],
    queryFn: async () => {
      const response = await listExecutorConfigs(200, 0);
      if (!response.success || !response.data) {
        const msg = response.error || "Failed to load executor configs";
        toast({ title: "Error loading executor configs", description: msg, variant: "destructive" });
        throw new Error(msg);
      }
      return response.data;
    },
    enabled: open,
    staleTime: 1000 * 30,
  });

  const handleLoad = () => {
    if (!configs || !selectedConfigId) return;
    const selected = configs.find((c) => c.config_id === selectedConfigId);
    if (!selected) return;
    onLoadConfig(selected);
    setSelectedConfigId(null);
    onOpenChange(false);
  };

  const formatDate = (value: string) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Load Saved Simulation</DialogTitle>
          <DialogDescription>
            Select an executor config stored in Stage1 to load into the Trade Simulator panel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-auto">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load configs: {error.message}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : configs && configs.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Threshold Choice</TableHead>
                    <TableHead className="text-right">Position Size</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-16 text-center">Pick</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((cfg) => (
                    <TableRow
                      key={cfg.config_id}
                      className={`cursor-pointer ${selectedConfigId === cfg.config_id ? "bg-secondary" : ""}`}
                      onClick={() => setSelectedConfigId(cfg.config_id)}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          checked={selectedConfigId === cfg.config_id}
                          onChange={() => setSelectedConfigId(cfg.config_id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cfg.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cfg.threshold_choice}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {cfg.position_size.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(cfg.updated_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        {selectedConfigId === cfg.config_id && (
                          <CheckCircle className="h-4 w-4 text-green-600 inline" title="Selected" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No executor configs found in Stage1 (use “Save Simulation” to create one)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLoad} disabled={!selectedConfigId}>
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

