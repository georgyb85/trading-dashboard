import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ExecutorConfig, LiveModelSummary } from '@/lib/kraken/types';

interface ExecutorConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: ExecutorConfig) => void;
  model: LiveModelSummary | null;
  isSubmitting: boolean;
  mode: 'attach' | 'update';
}

const DEFAULT_CONFIG: Omit<ExecutorConfig, 'stream_id' | 'symbol' | 'exchange' | 'long_threshold' | 'short_threshold'> = {
  position_size_pct: 0.02,
  stop_loss_atr_mult: 1.5,
  take_profit_atr_mult: 2.0,
  stop_loss_pct: 0.02,
  take_profit_pct: 0.04,
  max_bars_held: 24,
  stop_loss_cooldown_bars: 4,
  max_positions: 1,
  max_equity_pct: 0.1,
  max_position_notional: 1000,
  target_horizon_bars: 1,
  enabled: true,
};

export function ExecutorConfigModal({
  open,
  onClose,
  onSubmit,
  model,
  isSubmitting,
  mode,
}: ExecutorConfigModalProps) {
  const [config, setConfig] = useState<ExecutorConfig>({
    stream_id: '',
    symbol: 'PF_XBTUSD',
    exchange: 'kraken',
    long_threshold: 0.015,
    short_threshold: -0.012,
    ...DEFAULT_CONFIG,
  });

  // Initialize from model when opened
  useEffect(() => {
    if (model && open) {
      setConfig((prev) => ({
        ...prev,
        stream_id: model.stream_id || '',
        long_threshold: model.long_threshold ?? 0.015,
        short_threshold: model.short_threshold ?? -0.012,
        target_horizon_bars: model.target_horizon_bars ?? 1,
      }));
    }
  }, [model, open]);

  const handleSubmit = () => {
    onSubmit(config);
  };

  const updateField = <K extends keyof ExecutorConfig>(field: K, value: ExecutorConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'attach' ? 'Attach Executor' : 'Update Executor'} - {model?.model_id.slice(0, 8)}...
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Identity */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Identity</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stream_id">Stream ID</Label>
                <Input
                  id="stream_id"
                  value={config.stream_id}
                  onChange={(e) => updateField('stream_id', e.target.value)}
                  placeholder="btcusdt_1h"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={config.symbol}
                  onChange={(e) => updateField('symbol', e.target.value)}
                  placeholder="PF_XBTUSD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange">Exchange</Label>
                <Select
                  value={config.exchange}
                  onValueChange={(v) => updateField('exchange', v as 'kraken' | 'binance')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Signal Thresholds</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="long_threshold">Long Threshold</Label>
                <Input
                  id="long_threshold"
                  type="number"
                  step="0.001"
                  value={config.long_threshold}
                  onChange={(e) => updateField('long_threshold', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_threshold">Short Threshold</Label>
                <Input
                  id="short_threshold"
                  type="number"
                  step="0.001"
                  value={config.short_threshold}
                  onChange={(e) => updateField('short_threshold', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Position Sizing */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Position Sizing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position_size_pct">Position Size %</Label>
                <Input
                  id="position_size_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.position_size_pct}
                  onChange={(e) => updateField('position_size_pct', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_equity_pct">Max Equity %</Label>
                <Input
                  id="max_equity_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.max_equity_pct}
                  onChange={(e) => updateField('max_equity_pct', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_position_notional">Max Notional</Label>
                <Input
                  id="max_position_notional"
                  type="number"
                  step="100"
                  min="0"
                  value={config.max_position_notional}
                  onChange={(e) => updateField('max_position_notional', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Bracket Orders */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Stop Loss / Take Profit</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stop_loss_atr_mult">SL ATR Multiplier</Label>
                <Input
                  id="stop_loss_atr_mult"
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.stop_loss_atr_mult}
                  onChange={(e) => updateField('stop_loss_atr_mult', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="take_profit_atr_mult">TP ATR Multiplier</Label>
                <Input
                  id="take_profit_atr_mult"
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.take_profit_atr_mult}
                  onChange={(e) => updateField('take_profit_atr_mult', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stop_loss_pct">SL % (fallback)</Label>
                <Input
                  id="stop_loss_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.stop_loss_pct}
                  onChange={(e) => updateField('stop_loss_pct', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="take_profit_pct">TP % (fallback)</Label>
                <Input
                  id="take_profit_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.take_profit_pct}
                  onChange={(e) => updateField('take_profit_pct', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Time & Exit Controls */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Time & Exit Controls</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_bars_held">Max Bars Held</Label>
                <Input
                  id="max_bars_held"
                  type="number"
                  min="1"
                  value={config.max_bars_held}
                  onChange={(e) => updateField('max_bars_held', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stop_loss_cooldown_bars">SL Cooldown Bars</Label>
                <Input
                  id="stop_loss_cooldown_bars"
                  type="number"
                  min="0"
                  value={config.stop_loss_cooldown_bars}
                  onChange={(e) => updateField('stop_loss_cooldown_bars', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_horizon_bars">Target Horizon</Label>
                <Input
                  id="target_horizon_bars"
                  type="number"
                  min="1"
                  value={config.target_horizon_bars ?? 1}
                  onChange={(e) => updateField('target_horizon_bars', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>

          {/* Risk Limits */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Risk Limits</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_positions">Max Positions</Label>
                <Input
                  id="max_positions"
                  type="number"
                  min="1"
                  value={config.max_positions}
                  onChange={(e) => updateField('max_positions', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="enabled"
                  checked={config.enabled ?? true}
                  onCheckedChange={(v) => updateField('enabled', v)}
                />
                <Label htmlFor="enabled">Executor Enabled</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : mode === 'attach' ? 'Attach Executor' : 'Update Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
