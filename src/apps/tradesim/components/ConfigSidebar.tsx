import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronLeft } from "lucide-react";
import type { TradeConfig, StressTestConfig } from "@/lib/stage1/types";

interface ConfigSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  tradeConfig: TradeConfig;
  onTradeConfigChange: (config: TradeConfig) => void;
  stressTestConfig: StressTestConfig;
  onStressTestConfigChange: (config: StressTestConfig) => void;
}

export const ConfigSidebar = ({
  isOpen,
  onToggle,
  tradeConfig,
  onTradeConfigChange,
  stressTestConfig,
  onStressTestConfigChange,
}: ConfigSidebarProps) => {
  const updateTradeConfig = (updates: Partial<TradeConfig>) => {
    onTradeConfigChange({ ...tradeConfig, ...updates });
  };

  const updateStressTestConfig = (updates: Partial<StressTestConfig>) => {
    onStressTestConfigChange({ ...stressTestConfig, ...updates });
  };

  return (
    <aside className={`${isOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-border bg-sidebar`}>
      <div className="p-6 space-y-6 w-80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Configuration</h2>
          <button onClick={onToggle} className="p-1 hover:bg-sidebar-accent rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Trade Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Trade Configuration</h3>

          {/* Position Size */}
          <div className="space-y-2">
            <Label className="text-sm">Position Size ($)</Label>
            <Input
              type="number"
              value={tradeConfig.position_size}
              onChange={(e) => updateTradeConfig({ position_size: parseFloat(e.target.value) || 1000 })}
              min={1}
              step={100}
            />
          </div>

          {/* Entry Thresholds */}
          <div className="space-y-2">
            <Label className="text-sm">Entry Thresholds</Label>
            <RadioGroup
              value={tradeConfig.threshold_choice}
              onValueChange={(val) => updateTradeConfig({ threshold_choice: val })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="optimal_roc" id="optimal" />
                <Label htmlFor="optimal" className="text-sm cursor-pointer">Optimal ROC thresholds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentile_95_5" id="percentile" />
                <Label htmlFor="percentile" className="text-sm cursor-pointer">Percentile 95/5 thresholds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zero_cross" id="zero" />
                <Label htmlFor="zero" className="text-sm cursor-pointer">Zero crossover</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Exit Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Exit Methods</h3>

          {/* Signal Exit */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="signal-exit"
              checked={tradeConfig.use_signal_exit}
              onCheckedChange={(checked) => updateTradeConfig({ use_signal_exit: checked as boolean })}
            />
            <Label htmlFor="signal-exit" className="text-sm cursor-pointer">Use Signal Exit</Label>
          </div>

          {/* Take Profit */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="take-profit"
                checked={tradeConfig.use_take_profit}
                onCheckedChange={(checked) => updateTradeConfig({ use_take_profit: checked as boolean })}
              />
              <Label htmlFor="take-profit" className="text-sm cursor-pointer">Use Take Profit</Label>
            </div>

            {tradeConfig.use_take_profit && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">Take Profit %</Label>
                <Input
                  type="number"
                  value={tradeConfig.take_profit_pct}
                  onChange={(e) => updateTradeConfig({ take_profit_pct: parseFloat(e.target.value) || 5.0 })}
                  min={0.1}
                  max={100}
                  step={0.1}
                />
              </div>
            )}
          </div>

          {/* Stop Loss */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-stop-loss"
                checked={tradeConfig.use_stop_loss}
                onCheckedChange={(checked) => updateTradeConfig({ use_stop_loss: checked as boolean })}
              />
              <Label htmlFor="use-stop-loss" className="text-sm cursor-pointer">Use Stop Loss</Label>
            </div>

            {tradeConfig.use_stop_loss && (
              <div className="ml-6 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Stop Loss %</Label>
                  <Input
                    type="number"
                    value={tradeConfig.stop_loss_pct}
                    onChange={(e) => updateTradeConfig({ stop_loss_pct: parseFloat(e.target.value) || 2.0 })}
                    min={0.1}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Stop Loss Cooldown (bars)</Label>
                  <Input
                    type="number"
                    value={tradeConfig.stop_loss_cooldown ?? 0}
                    onChange={(e) => updateTradeConfig({ stop_loss_cooldown: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">0 = no cooldown</p>
                </div>
              </div>
            )}
          </div>

          {/* Time-Based Exit */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="time-exit"
                checked={tradeConfig.use_time_exit}
                onCheckedChange={(checked) => updateTradeConfig({ use_time_exit: checked as boolean })}
              />
              <Label htmlFor="time-exit" className="text-sm cursor-pointer">Use Time-Based Exit</Label>
            </div>

            {tradeConfig.use_time_exit && (
              <div className="ml-6 space-y-2">
                <Label className="text-sm">Max Holding Period (bars)</Label>
                <Input
                  type="number"
                  value={tradeConfig.max_holding_bars}
                  onChange={(e) => updateTradeConfig({ max_holding_bars: parseInt(e.target.value) || 50 })}
                  min={1}
                  max={1000}
                  step={1}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stress Testing Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Stress Testing</h3>

          <div className="space-y-2">
            <Label className="text-sm">Bootstrap Iterations</Label>
            <Input
              type="number"
              value={stressTestConfig.bootstrap_iterations}
              onChange={(e) => updateStressTestConfig({ bootstrap_iterations: parseInt(e.target.value) || 1000 })}
              min={100}
              max={10000}
              step={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">MCPT Iterations</Label>
            <Input
              type="number"
              value={stressTestConfig.mcpt_iterations}
              onChange={(e) => updateStressTestConfig({ mcpt_iterations: parseInt(e.target.value) || 1000 })}
              min={100}
              max={10000}
              step={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Random Seed</Label>
            <Input
              type="number"
              value={stressTestConfig.seed}
              onChange={(e) => updateStressTestConfig({ seed: parseInt(e.target.value) || 42 })}
              min={0}
              step={1}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
