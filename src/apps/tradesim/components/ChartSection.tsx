import { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, AreaChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from "recharts";
import type { SimulateTradesResponse } from "@/lib/stage1/types";

interface ChartSectionProps {
  results: SimulateTradesResponse;
  tradeFilter: "all" | "long" | "short";
}

type DrawdownPoint = { timestamp: number; value: number };

const buildStrategyDrawdown = (trades: NonNullable<SimulateTradesResponse['trades']>) : DrawdownPoint[] => {
  if (!trades.length) return [];

  const points: DrawdownPoint[] = [];
  const firstEntryTs = new Date(trades[0].entry_time).getTime();
  points.push({ timestamp: firstEntryTs, value: 0 });

  let cumulativeReturn = 0; // percent
  let peakEquity = 100; // base 100%

  trades.forEach((trade) => {
    cumulativeReturn += trade.return_pct;
    const equity = 100 + cumulativeReturn;
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const drawdown = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;
    points.push({
      timestamp: new Date(trade.exit_time).getTime(),
      value: drawdown,
    });
  });

  return points;
};

const buildBuyHoldDrawdown = (
  buyHoldSeries: NonNullable<SimulateTradesResponse['buy_hold_pnl']>,
  totalReturnPct?: number
): DrawdownPoint[] => {
  if (!buyHoldSeries.length) return [];

  const finalPnl = buyHoldSeries[buyHoldSeries.length - 1]?.pnl ?? 0;
  let baseCapital = 1000;
  if (totalReturnPct && Math.abs(totalReturnPct) > 1e-6) {
    const impliedBase = finalPnl / (totalReturnPct / 100);
    if (isFinite(impliedBase) && Math.abs(impliedBase) > 1e-3) {
      baseCapital = impliedBase;
    }
  }

  let peakEquity = baseCapital;
  const points: DrawdownPoint[] = [];

  buyHoldSeries.forEach((point) => {
    const equity = baseCapital + point.pnl;
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const drawdown = peakEquity > 0 ? ((equity - peakEquity) / peakEquity) * 100 : 0;
    points.push({ timestamp: point.timestamp, value: drawdown });
  });

  return points;
};

const ChartSectionComponent = ({ results, tradeFilter }: ChartSectionProps) => {
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
  console.log('[ChartSection] Trade filter:', tradeFilter);

  // Memoize filtered data calculation
  const { filteredTrades, strategyPnl, filteredPerformance } = useMemo(() => {
    const allTrades = results.trades ?? [];
    let trades = allTrades;
    let pnl = results.strategy_pnl;
    let performance = results.performance;

    if (tradeFilter !== "all") {
      trades = allTrades.filter(trade => trade.side === tradeFilter);
      performance = tradeFilter === "long" ? results.long_only : results.short_only;

      if (trades.length > 0) {
        let cumulativePnl = 0;
        const pnlPoints = trades.map(trade => {
          cumulativePnl += trade.pnl;
          return {
            timestamp: new Date(trade.exit_time).getTime(),
            pnl: cumulativePnl,
          };
        });
        const startTime = new Date(trades[0].entry_time).getTime();
        pnl = [{ timestamp: startTime, pnl: 0 }, ...pnlPoints];
      } else {
        pnl = [];
      }
    }

    return { filteredTrades: trades, strategyPnl: pnl, filteredPerformance: performance };
  }, [results.trades, results.strategy_pnl, results.performance, results.long_only, results.short_only, tradeFilter]);

  // Memoize PnL data merging and forward-filling
  const pnlData = useMemo(() => {
    const timeline = new Map<number, { timestamp: number; strategy?: number; buyHold?: number }>();
    results.buy_hold_pnl.forEach((point) => {
      timeline.set(point.timestamp, { timestamp: point.timestamp, buyHold: point.pnl });
    });
    strategyPnl.forEach((point) => {
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

    return merged.map((point) => ({
      timestamp: point.timestamp,
      strategy: point.strategy ?? null,
      buyHold: point.buyHold ?? null,
    }));
  }, [results.buy_hold_pnl, strategyPnl]);

  console.log('[ChartSection] Combined timeline points:', pnlData.length);
  console.log('[ChartSection] First merged point:', pnlData[0]);
  console.log('[ChartSection] Last merged point:', pnlData[pnlData.length - 1]);

  // Memoize drawdown calculations
  const { drawdownData, showDrawdownChart } = useMemo(() => {
    const strategyDrawdownPoints = filteredTrades.length
      ? buildStrategyDrawdown(filteredTrades)
      : [];

    const buyHoldDrawdownPoints = buildBuyHoldDrawdown(
      results.buy_hold_pnl,
      results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct
    );

    const showChart = strategyDrawdownPoints.length > 0 || buyHoldDrawdownPoints.length > 0;

    const drawdownTimeline = new Map<number, { timestamp: number; strategy?: number; buyHold?: number }>();
    strategyDrawdownPoints.forEach(point => {
      drawdownTimeline.set(point.timestamp, { timestamp: point.timestamp, strategy: point.value });
    });
    buyHoldDrawdownPoints.forEach(point => {
      const existing = drawdownTimeline.get(point.timestamp);
      if (existing) {
        existing.buyHold = point.value;
      } else {
        drawdownTimeline.set(point.timestamp, { timestamp: point.timestamp, buyHold: point.value });
      }
    });

    const mergedDrawdowns = Array.from(drawdownTimeline.values()).sort((a, b) => a.timestamp - b.timestamp);
    let lastStrategyDd = 0;
    let lastBuyHoldDd = 0;
    mergedDrawdowns.forEach(point => {
      if (typeof point.strategy === 'number') {
        lastStrategyDd = point.strategy;
      } else {
        point.strategy = lastStrategyDd;
      }
      if (typeof point.buyHold === 'number') {
        lastBuyHoldDd = point.buyHold;
      } else {
        point.buyHold = lastBuyHoldDd;
      }
    });

    const data = mergedDrawdowns.map(point => ({
      timestamp: point.timestamp,
      strategyDrawdown: point.strategy ?? 0,
      buyHoldDrawdown: point.buyHold ?? 0,
    }));

    return { drawdownData: data, showDrawdownChart: showChart };
  }, [filteredTrades, results.buy_hold_pnl, results.buy_hold?.total_return_pct, results.buy_hold?.return_pct]);

  // Calculate max drawdown from performance metrics (handle both field name variants)
  const maxDrawdownValue = filteredPerformance?.max_drawdown ?? filteredPerformance?.max_drawdown_pct;
  const maxDrawdown = maxDrawdownValue !== undefined && maxDrawdownValue !== null
    ? Math.abs(maxDrawdownValue).toFixed(2)
    : '--';

  const buyHoldMaxDrawdownValue = results.buy_hold?.max_drawdown ?? results.buy_hold?.max_drawdown_pct;
  const buyHoldMaxDrawdown = buyHoldMaxDrawdownValue !== undefined && buyHoldMaxDrawdownValue !== null
    ? Math.abs(buyHoldMaxDrawdownValue).toFixed(2)
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

      {/* Drawdown Comparison Chart */}
      {showDrawdownChart ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Drawdown Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="strategyDrawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
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
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  labelFormatter={(value) => new Date(value as number).toLocaleString()}
                  formatter={(value: any, name) => [`${(value ?? 0).toFixed(2)}%`, name]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                {/* Shaded area between y=0 and strategy drawdown line */}
                <Area
                  type="monotone"
                  dataKey="strategyDrawdown"
                  name="Strategy DD"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#strategyDrawdownGradient)"
                  connectNulls
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="buyHoldDrawdown"
                  name="Buy & Hold DD"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="none"
                  connectNulls
                  isAnimationActive={false}
                />
              </AreaChart>
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
              <div className="ml-auto flex gap-4">
                {maxDrawdown !== '--' && (
                  <div>
                    <span className="text-sm text-muted-foreground">Strategy Max DD: </span>
                    <span className="text-sm font-semibold text-destructive">-{maxDrawdown}%</span>
                  </div>
                )}
                {buyHoldMaxDrawdown !== '--' && (
                  <div>
                    <span className="text-sm text-muted-foreground">Buy & Hold Max DD: </span>
                    <span className="text-sm font-semibold text-destructive">-{buyHoldMaxDrawdown}%</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Drawdown Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Not enough data to compute drawdowns for this filter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Returns Distribution Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Strategy vs Buy & Hold Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Strategy Stats */}
            <div className="space-y-2 p-4 rounded-lg bg-secondary/30">
              <h4 className="text-sm font-semibold text-foreground">
                Strategy Performance {tradeFilter !== "all" && `(${tradeFilter === "long" ? "Long Only" : "Short Only"})`}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Return:</span>
                  <span className={`font-mono font-semibold ${
                    ((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0) >= 0 ? 'profit-text' : 'loss-text'
                  }`}>
                    {(((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0) >= 0 ? '+' : '')}
                    {((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Factor:</span>
                  <span className="font-mono">{(filteredPerformance?.profit_factor || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharpe Ratio:</span>
                  <span className="font-mono">{(filteredPerformance?.sharpe_ratio || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Drawdown:</span>
                  <span className="font-mono text-destructive">
                    {((filteredPerformance?.max_drawdown ?? filteredPerformance?.max_drawdown_pct) || 0).toFixed(2)}%
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
                (((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)) >= 0
                  ? 'profit-text'
                  : 'loss-text'
              }`}>
                {(((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)) >= 0 ? '+' : ''}
                {(((filteredPerformance?.total_return_pct ?? filteredPerformance?.return_pct) || 0) - ((results.buy_hold?.total_return_pct ?? results.buy_hold?.return_pct) || 0)).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const ChartSection = memo(ChartSectionComponent);
