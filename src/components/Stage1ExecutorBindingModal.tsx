import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { config } from "@/lib/config";
import type { LiveModelSummary } from "@/lib/kraken/types";
import { getExecutorBindingByModel, listExecutorConfigs } from "@/lib/stage1/client";
import type {
  Stage1ExecutorBinding,
  Stage1ExecutorBindingUpsertRequest,
  Stage1ExecutorConfig,
} from "@/lib/stage1/types";

type ExchangeChoice = "kraken" | "binance";

interface Stage1ExecutorBindingModalProps {
  open: boolean;
  onClose: () => void;
  model: LiveModelSummary | null;
  isSubmitting: boolean;
  mode: "attach" | "update";
  onSubmit: (request: Stage1ExecutorBindingUpsertRequest) => void;
}

const DEFAULT_PRIORITY = "100";
const DEFAULT_MAX_POSITIONS = "1";
const DEFAULT_MAX_EQUITY_PCT = "1.0";

const isNotFoundError = (errorMessage: string) => {
  return errorMessage.includes("HTTP 404");
};

export function Stage1ExecutorBindingModal({
  open,
  onClose,
  model,
  isSubmitting,
  mode,
  onSubmit,
}: Stage1ExecutorBindingModalProps) {
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [streamId, setStreamId] = useState<string>("");
  const [symbol, setSymbol] = useState<string>("");
  const [exchange, setExchange] = useState<ExchangeChoice>("kraken");
  const [priority, setPriority] = useState<string>(DEFAULT_PRIORITY);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [maxPositions, setMaxPositions] = useState<string>(DEFAULT_MAX_POSITIONS);
  const [maxEquityPct, setMaxEquityPct] = useState<string>(DEFAULT_MAX_EQUITY_PCT);

  const configsQuery = useQuery<Stage1ExecutorConfig[], Error>({
    queryKey: ["stage1", "executor_configs"],
    queryFn: async () => {
      const response = await listExecutorConfigs(200, 0);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to load executor configs");
      }
      return response.data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const bindingQuery = useQuery<Stage1ExecutorBinding | null, Error>({
    queryKey: ["stage1", "executor_binding_by_model", model?.model_id],
    queryFn: async () => {
      if (!model?.model_id) return null;
      const response = await getExecutorBindingByModel(model.model_id);
      if (!response.success || !response.data) {
        const msg = response.error || "Failed to load executor binding";
        if (isNotFoundError(msg)) return null;
        throw new Error(msg);
      }
      return response.data;
    },
    enabled: open && !!model?.model_id,
    staleTime: 30_000,
    retry: false,
  });

  const selectedConfig = useMemo(() => {
    return configsQuery.data?.find((cfg) => cfg.config_id === selectedConfigId) ?? null;
  }, [configsQuery.data, selectedConfigId]);

  useEffect(() => {
    if (!open) return;
    setSelectedConfigId("");
    setStreamId(model?.stream_id || "");
    setSymbol("");
    setExchange("kraken");
    setPriority(DEFAULT_PRIORITY);
    setEnabled(true);
    setMaxPositions(DEFAULT_MAX_POSITIONS);
    setMaxEquityPct(DEFAULT_MAX_EQUITY_PCT);
  }, [open, model?.stream_id]);

  useEffect(() => {
    if (!open) return;
    if (!bindingQuery.data) return;

    setSelectedConfigId(bindingQuery.data.executor_config_id);
    setStreamId(bindingQuery.data.stream_id);
    setSymbol(bindingQuery.data.symbol);
    setExchange(bindingQuery.data.exchange === "binance" ? "binance" : "kraken");
    setPriority(String(bindingQuery.data.priority ?? DEFAULT_PRIORITY));
    setEnabled(bindingQuery.data.enabled);
    setMaxPositions(String(bindingQuery.data.max_positions ?? DEFAULT_MAX_POSITIONS));
    setMaxEquityPct(String(bindingQuery.data.max_equity_pct ?? DEFAULT_MAX_EQUITY_PCT));
  }, [bindingQuery.data, open]);

  const priorityValue = useMemo(() => {
    const parsed = Number.parseInt(priority, 10);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }, [priority]);

  const maxPositionsValue = useMemo(() => {
    const parsed = Number.parseInt(maxPositions, 10);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }, [maxPositions]);

  const maxEquityPctValue = useMemo(() => {
    const parsed = Number.parseFloat(maxEquityPct);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }, [maxEquityPct]);

  const canSubmit =
    !!model?.model_id &&
    selectedConfigId.length > 0 &&
    streamId.trim().length > 0 &&
    symbol.trim().length > 0 &&
    exchange.length > 0 &&
    priorityValue !== null &&
    priorityValue >= 0 &&
    maxPositionsValue !== null &&
    maxPositionsValue > 0 &&
    maxEquityPctValue !== null &&
    maxEquityPctValue > 0 &&
    maxEquityPctValue <= 1.0;

  const handleSubmit = () => {
    if (!model?.model_id) return;
    if (!canSubmit) return;
    if (priorityValue === null) return;
    if (maxPositionsValue === null) return;
    if (maxEquityPctValue === null) return;

    onSubmit({
      trader_id: config.traderId,
      model_id: model.model_id,
      stream_id: streamId.trim(),
      symbol: symbol.trim(),
      exchange,
      executor_config_id: selectedConfigId,
      enabled,
      priority: priorityValue,
      max_positions: maxPositionsValue,
      max_equity_pct: maxEquityPctValue,
      created_by: "trading-dashboard",
    });
  };

  const title = mode === "attach" ? "Attach Executor" : "Update Executor";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title} - {model?.model_id.slice(0, 8)}...
          </DialogTitle>
          <DialogDescription>
            Bind a Stage1 executor config to this deployed model. Saving triggers a Kraken recovery reset to load the new desired state.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Executor Config */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2">Executor Config (Stage1)</h4>
            {configsQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : configsQuery.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{configsQuery.error.message}</AlertDescription>
              </Alert>
            ) : configsQuery.data && configsQuery.data.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="executor_config">Saved executor config</Label>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger id="executor_config">
                    <SelectValue placeholder="Select an executor config..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configsQuery.data.map((cfg) => (
                      <SelectItem key={cfg.config_id} value={cfg.config_id}>
                        {cfg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedConfig && (
                  <div className="text-xs text-muted-foreground">
                    threshold_choice={selectedConfig.threshold_choice}, position_size={selectedConfig.position_size}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No executor configs found in Stage1. Create one in Trade Simulator using “Save Simulation”.
              </div>
            )}
          </div>

          {/* Binding */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm border-b pb-2">Binding</h4>

            {bindingQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : bindingQuery.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{bindingQuery.error.message}</AlertDescription>
              </Alert>
            ) : bindingQuery.data ? (
              <div className="text-xs text-muted-foreground">
                Existing binding found in Stage1 (binding_id={bindingQuery.data.binding_id.slice(0, 8)}...)
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No existing binding found for this model in Stage1.</div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-3">
                <Label htmlFor="stream_id">Stream ID</Label>
                <Input
                  id="stream_id"
                  value={streamId}
                  onChange={(e) => setStreamId(e.target.value)}
                  placeholder="btcusdt_1h"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="PF_XBTUSD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select value={exchange} onValueChange={(v) => setExchange(v as ExchangeChoice)}>
                  <SelectTrigger id="exchange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_positions">Max Positions</Label>
                <Input
                  id="max_positions"
                  type="number"
                  min="1"
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_equity_pct">Max Equity % (0..1)</Label>
                <Input
                  id="max_equity_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={maxEquityPct}
                  onChange={(e) => setMaxEquityPct(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting || configsQuery.isLoading}>
            {isSubmitting ? "Saving..." : mode === "attach" ? "Attach Executor" : "Update Binding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
