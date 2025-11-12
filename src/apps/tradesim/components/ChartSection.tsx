import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { SimulateTradesResponse } from "@/lib/stage1/types";

interface ChartSectionProps {
  results: SimulateTradesResponse;
}

export const ChartSection = ({ results }: ChartSectionProps) => {
  if (!results.strategy_pnl || !results.buy_hold_pnl) {
    console.log('[ChartSection] Missing PnL data:', {
      hasStrategyPnl: !!results.strategy_pnl,
      hasBuyHoldPnl: !!results.buy_hold_pnl,
    });
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No chart data available</p>
      </div>
    );
  }

  console.log('[ChartSection] Strategy PnL points:', results.strategy_pnl.length);
  console.log('[ChartSection] Buy&Hold PnL points:', results.buy_hold_pnl.length);

  // Merge both series on timestamp so we can respect their individual sampling rates
  const timeline = new Map<number, { timestamp: number; strategy?: number; buyHold?: number }>();
  results.buy_hold_pnl.forEach((point) => {
    timeline.set(point.timestamp, { timestamp: point.timestamp, buyHold: point.pnl });
  });
  results.strategy_pnl.forEach((point) => {
    const existing = timeline.get(point.timestamp);
    if (existing) {
      existing.strategy = point.pnl;
    } else {
      timeline.set(point.timestamp, { timestamp: point.timestamp, strategy: point.pnl });
    }
  });

  const merged = Array.from(timeline.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Forward-fill values so lines remain continuous between sampling points
  let lastStrategy: number | null = null;
  let lastBuyHold: number | null = null;
  merged.forEach((point) => {
    if (typeof point.strategy === 'number') {
      lastStrategy = point.strategy;
    } else if (lastStrategy !== null) {
      point.strategy = lastStrategy;
    }
    if (typeof point.buyHold === 'number') {
      lastBuyHold = point.buyHold;
    } else if (lastBuyHold !== null) {
      point.buyHold = lastBuyHold;
    }
  });

  const pnlData = merged.map((point) => ({
    timestamp: point.timestamp,
    strategy: point.strategy ?? null,
    buyHold: point.buyHold ?? null,
  }));

  console.log('[ChartSection] Combined timeline points:', pnlData.length);
  console.log('[ChartSection] First merged point:', pnlData[0]);
  console.log('[ChartSection] Last merged point:', pnlData[pnlData.length - 1]);

  // Calculate max drawdown from performance metrics (handle both field name variants)
  const maxDrawdownValue = results.performance?.max_drawdown ?? results.performance?.max_drawdown_pct;
  const maxDrawdown = maxDrawdownValue !== undefined && maxDrawdownValue !== null
    ? Math.abs(maxDrawdownValue).toFixed(2)
    : '--';

  return (
    <div className="space-y-4">
      {/* Cumulative P&L Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Cumulative P&L Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) =>
                  new Date(value as number).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                }
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                labelFormatter={(value) => new Date(value as number).toLocaleString()}
                formatter={(value: any, name) => [`$${(value ?? 0).toFixed(2)}`, name]}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="strategy"
                name="Strategy"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="buyHold"
                name="Buy & Hold"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Strategy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Buy & Hold</span>
            </div>
            {maxDrawdown !== '--' && (
              <div className="ml-auto">
                <span className="text-sm text-muted-foreground">Max Drawdown: </span>
                <span className="text-sm font-semibold text-destructive">{maxDrawdown}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Returns Distribution Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Strategy vs Buy & Hold Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Strategy Stats */}
            <div className="space-y-2 p-4 rounded-lg bg-secondary/30">
              <h4 className="text-sm font-semibold text-foreground">Strategy Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Return:</span>
                  <span className={`font-mono font-semibold ${
                    ((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0) >= 0 ? 'profit-text' : 'loss-text'
                  }`}>
                    {(((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0) >= 0 ? '+' : '')}
                    {((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Factor:</span>
                  <span className="font-mono">{(results.performance?.profit_factor || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharpe Ratio:</span>
                  <span className="font-mono">{(results.performance?.sharpe_ratio || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Drawdown:</span>
                  <span className="font-mono text-destructive">
                    {((results.performance?.max_drawdown ?? results.performance?.max_drawdown_pct) || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Buy & Hold Stats */}
            <div className="space-y-2 p-4 rounded-lg bg-secondary/30">
              <h4 className="text-sm font-semibold text-foreground">Buy & Hold Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Return:</span>
                  <span className={`font-mono font-semibold ${
                    ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0) >= 0 ? 'profit-text' : 'loss-text'
                  }`}>
                    {(((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0) >= 0 ? '+' : '')}
                    {((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Factor:</span>
                  <span className="font-mono">{(results.buy_hold?.profit_factor || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharpe Ratio:</span>
                  <span className="font-mono">{(results.buy_hold?.sharpe_ratio || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Drawdown:</span>
                  <span className="font-mono text-destructive">
                    {((results.buy_hold?.max_drawdown ?? results.buy_hold?.max_drawdown_pct) || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Outperformance Summary */}
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Strategy Outperformance:</span>
              <span className={`text-lg font-bold font-mono ${
                (((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)) >= 0
                  ? 'profit-text'
                  : 'loss-text'
              }`}>
                {(((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)) >= 0 ? '+' : ''}
                {(((results.performance?.total_return_pct ?? results.performance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
