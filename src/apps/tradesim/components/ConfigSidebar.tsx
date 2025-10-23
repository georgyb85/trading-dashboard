import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";

interface ConfigSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ConfigSidebar = ({ isOpen, onToggle }: ConfigSidebarProps) => {
  const [useSignalDecay, setUseSignalDecay] = useState(true);
  const [useTakeProfit, setUseTakeProfit] = useState(true);
  const [takeProfitType, setTakeProfitType] = useState<"fixed" | "atr">("fixed");
  const [useStopLoss, setUseStopLoss] = useState(true);
  const [stopLossType, setStopLossType] = useState<"fixed" | "atr">("fixed");
  const [useTimeExit, setUseTimeExit] = useState(true);

  const [exitSignalStrength, setExitSignalStrength] = useState(31.9);
  const [takeProfitPercent, setTakeProfitPercent] = useState(56.61);
  const [tpAtrMultiplier, setTpAtrMultiplier] = useState(29.57);
  const [tpAtrPeriod, setTpAtrPeriod] = useState(38);
  const [stopLossPercent, setStopLossPercent] = useState(20);
  const [slAtrMultiplier, setSlAtrMultiplier] = useState(29.37);
  const [slAtrPeriod, setSlAtrPeriod] = useState(30);
  const [stopLossCooldown, setStopLossCooldown] = useState(2);
  const [maxHoldingPeriod, setMaxHoldingPeriod] = useState(50);

  return (
    <aside className={`${isOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-border bg-sidebar`}>
      <div className="p-6 space-y-6 w-80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-sidebar-foreground">Configuration</h2>
          <button onClick={onToggle} className="p-1 hover:bg-sidebar-accent rounded">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Exit Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Exit Methods</h3>
          
          {/* Signal Decay Exit */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="signal-decay" 
                checked={useSignalDecay}
                onCheckedChange={(checked) => setUseSignalDecay(checked as boolean)}
              />
              <Label htmlFor="signal-decay" className="text-sm">Use Signal Decay Exit</Label>
            </div>

            {useSignalDecay && (
              <div className="ml-6 space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Exit Signal Strength</Label>
                  <span className="text-sm text-muted-foreground">{(exitSignalStrength / 100).toFixed(3)}</span>
                </div>
                <Slider 
                  value={[exitSignalStrength]} 
                  onValueChange={([val]) => setExitSignalStrength(val)}
                  max={100} 
                  step={0.1} 
                />
              </div>
            )}
          </div>

          {/* Signal Reversal */}
          <div className="flex items-center space-x-2">
            <Checkbox id="signal-reversal" />
            <Label htmlFor="signal-reversal" className="text-sm">Honor Signal Reversal</Label>
          </div>

          {/* Take Profit */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="take-profit" 
                checked={useTakeProfit}
                onCheckedChange={(checked) => setUseTakeProfit(checked as boolean)}
              />
              <Label htmlFor="take-profit" className="text-sm">Use Take Profit</Label>
            </div>

            {useTakeProfit && (
              <div className="ml-6 space-y-3">
                <RadioGroup 
                  value={takeProfitType} 
                  onValueChange={(val) => setTakeProfitType(val as "fixed" | "atr")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed-tp" />
                    <Label htmlFor="fixed-tp" className="text-sm">Fixed % TP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="atr" id="atr-tp" />
                    <Label htmlFor="atr-tp" className="text-sm">ATR-based TP</Label>
                  </div>
                </RadioGroup>

                {takeProfitType === "fixed" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Take Profit %</Label>
                      <span className="text-sm text-muted-foreground">{(takeProfitPercent / 10).toFixed(3)}</span>
                    </div>
                    <Slider 
                      value={[takeProfitPercent]} 
                      onValueChange={([val]) => setTakeProfitPercent(val)}
                      max={100} 
                      step={0.1} 
                    />
                  </div>
                )}

                {takeProfitType === "atr" && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">ATR Multiplier</Label>
                        <span className="text-sm text-muted-foreground">{(tpAtrMultiplier / 10).toFixed(3)}</span>
                      </div>
                      <Slider 
                        value={[tpAtrMultiplier]} 
                        onValueChange={([val]) => setTpAtrMultiplier(val)}
                        max={100} 
                        step={0.1} 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">ATR Period</Label>
                        <span className="text-sm text-muted-foreground">{tpAtrPeriod}</span>
                      </div>
                      <Slider 
                        value={[tpAtrPeriod]} 
                        onValueChange={([val]) => setTpAtrPeriod(val)}
                        max={100} 
                        step={1} 
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stop Loss */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="use-stop-loss" 
                checked={useStopLoss}
                onCheckedChange={(checked) => setUseStopLoss(checked as boolean)}
              />
              <Label htmlFor="use-stop-loss" className="text-sm">Use Stop Loss</Label>
            </div>

            {useStopLoss && (
              <div className="ml-6 space-y-3">
                <RadioGroup 
                  value={stopLossType} 
                  onValueChange={(val) => setStopLossType(val as "fixed" | "atr")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed-sl" />
                    <Label htmlFor="fixed-sl" className="text-sm">Fixed %</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="atr" id="atr-sl" />
                    <Label htmlFor="atr-sl" className="text-sm">ATR-based</Label>
                  </div>
                </RadioGroup>

                {stopLossType === "fixed" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Stop Loss %</Label>
                      <span className="text-sm text-muted-foreground">{(stopLossPercent / 10).toFixed(3)}</span>
                    </div>
                    <Slider 
                      value={[stopLossPercent]} 
                      onValueChange={([val]) => setStopLossPercent(val)}
                      max={100} 
                      step={0.1} 
                    />
                  </div>
                )}

                {stopLossType === "atr" && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">ATR Multiplier</Label>
                        <span className="text-sm text-muted-foreground">{(slAtrMultiplier / 10).toFixed(3)}</span>
                      </div>
                      <Slider 
                        value={[slAtrMultiplier]} 
                        onValueChange={([val]) => setSlAtrMultiplier(val)}
                        max={100} 
                        step={0.1} 
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm">ATR Period</Label>
                        <span className="text-sm text-muted-foreground">{slAtrPeriod}</span>
                      </div>
                      <Slider 
                        value={[slAtrPeriod]} 
                        onValueChange={([val]) => setSlAtrPeriod(val)}
                        max={100} 
                        step={1} 
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Stop Loss Cooldown (bars)</Label>
                    <span className="text-sm text-muted-foreground">{stopLossCooldown === 0 ? '--' : stopLossCooldown}</span>
                  </div>
                  <Slider 
                    value={[stopLossCooldown]} 
                    onValueChange={([val]) => setStopLossCooldown(val)}
                    max={100} 
                    step={1} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Time-Based Exit */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="time-exit" 
                checked={useTimeExit}
                onCheckedChange={(checked) => setUseTimeExit(checked as boolean)}
              />
              <Label htmlFor="time-exit" className="text-sm">Use Time-Based Exit</Label>
            </div>

            {useTimeExit && (
              <div className="ml-6 space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Max Holding Period (bars)</Label>
                  <span className="text-sm text-muted-foreground">{maxHoldingPeriod}</span>
                </div>
                <Slider 
                  value={[maxHoldingPeriod]} 
                  onValueChange={([val]) => setMaxHoldingPeriod(val)}
                  max={100} 
                  step={1} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Entry Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Entry Options</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="limit-orders" />
            <Label htmlFor="limit-orders" className="text-sm">Use Limit Orders</Label>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Entry Thresholds</Label>
            <RadioGroup defaultValue="optimal" className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="optimal" id="optimal" />
                <Label htmlFor="optimal" className="text-sm">Optimal ROC thresholds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentile" id="percentile" />
                <Label htmlFor="percentile" className="text-sm">Percentile 95/5 thresholds</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zero" id="zero" />
                <Label htmlFor="zero" className="text-sm">Zero crossover</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-sidebar-foreground">Display Options</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="show-trade-list" defaultChecked />
            <Label htmlFor="show-trade-list" className="text-sm">Show Trade List</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="show-pnl" defaultChecked />
            <Label htmlFor="show-pnl" className="text-sm">Show P&L Chart</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="show-perfold" />
            <Label htmlFor="show-perfold" className="text-sm">Show Per-fold Stats</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="show-performance" defaultChecked />
            <Label htmlFor="show-performance" className="text-sm">Show Performance Report</Label>
          </div>
        </div>

        {/* Simulation Run */}
        <div className="space-y-2">
          <Label className="text-sm">Select Simulation Run</Label>
          <Select defaultValue="run2">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="run1">Run 1</SelectItem>
              <SelectItem value="run2">Run 2</SelectItem>
              <SelectItem value="run3">Run 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </aside>
  );
};
