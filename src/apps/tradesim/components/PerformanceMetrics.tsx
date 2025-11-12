import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSection } from "./ChartSection";
import type {
  SimulateTradesResponse,
  PerformanceMetrics as Metrics,
  StressTestInterval,
  StressTestResult,
} from "@/lib/stage1/types";

interface PerformanceMetricsProps {
  results: SimulateTradesResponse;
  tradeFilter: "all" | "long" | "short";
}

const formatMetric = (value: any, isPercent: boolean = false, isDrawdown: boolean = false): string => {
  if (value === null || value === undefined) return '--';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '--';

  if (isPercent) {
    // For drawdown, don't add + sign even if positive
    if (isDrawdown) {
      return `${num.toFixed(2)}%`;
    }
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  }
  return num.toFixed(2);
};

const scaleMetric = (value: number | undefined, isPercent: boolean): number | null => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  return isPercent ? value * 100 : value;
};

const formatIntervalEstimate = (interval?: StressTestInterval, isPercent = false, decimals = isPercent ? 2 : 3, alreadyScaled = false) => {
  // If alreadyScaled is true, don't multiply by 100 again
  const scaled = alreadyScaled ? interval?.estimate : scaleMetric(interval?.estimate, isPercent);
  if (scaled === null || scaled === undefined) return '--';
  return `${scaled.toFixed(decimals)}${isPercent ? '%' : ''}`;
};

const formatIntervalRange = (
  low?: number,
  high?: number,
  isPercent = false,
  decimals = isPercent ? 2 : 3,
  alreadyScaled = false
) => {
  // If alreadyScaled is true, don't multiply by 100 again
  const lowScaled = alreadyScaled ? low : scaleMetric(low, isPercent);
  const highScaled = alreadyScaled ? high : scaleMetric(high, isPercent);
  if (lowScaled === null || lowScaled === undefined || highScaled === null || highScaled === undefined) return '--';
  const suffix = isPercent ? '%' : '';
  return `[${lowScaled.toFixed(decimals)}${suffix}, ${highScaled.toFixed(decimals)}${suffix}]`;
};

const formatPValue = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '--';
  if (value < 0.0001) return '<0.0001';
  return value.toFixed(4);
};

const renderStressSection = (title: string, data?: StressTestResult) => {
  if (!data) return null;

  const metrics: Array<{
    key: keyof StressTestResult;
    label: string;
    isPercent?: boolean;
    alreadyScaled?: boolean;
    pKey: keyof NonNullable<StressTestResult['pvalues']>;
  }> = [
    { key: 'sharpe', label: 'Sharpe Ratio', pKey: 'sharpe' },
    { key: 'profit_factor', label: 'Profit Factor', pKey: 'profit_factor' },
    { key: 'total_return_pct', label: 'Total Return', isPercent: true, alreadyScaled: true, pKey: 'total_return' },
    { key: 'max_drawdown', label: 'Max Drawdown', isPercent: true, alreadyScaled: true, pKey: 'max_drawdown' },
  ];

  return (
    <div className="rounded-xl border-2 border-border/60 bg-gradient-to-br from-card to-card/50 p-5 shadow-md hover:shadow-lg transition-shadow" key={title}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-base font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sample Size: <span className="font-semibold">{data.sample_size ?? '--'}</span>
              {data.bootstrap_iterations !== undefined && ` · Bootstrap ${data.bootstrap_iterations}`}
              {data.mcpt_iterations !== undefined && ` · MCPT ${data.mcpt_iterations}`}
            </p>
          </div>
          {data.computed === false && (
            <span className="text-[0.65rem] font-semibold uppercase text-destructive bg-destructive/10 px-2 py-1 rounded">insufficient data</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground border-b border-border/40">
              <th className="py-2 text-left font-semibold">Metric</th>
              <th className="py-2 text-left font-semibold">Estimate</th>
              <th className="py-2 text-left font-semibold">90% CI</th>
              <th className="py-2 text-left font-semibold">95% CI</th>
              <th className="py-2 text-left font-semibold">p-value</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label, isPercent, alreadyScaled, pKey }) => {
              const interval = (data as any)[key] as StressTestInterval | undefined;
              if (!interval) return null;
              return (
                <tr key={`${title}-${key}`} className="border-t border-border/30 hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 text-muted-foreground font-medium">{label}</td>
                  <td className="py-2.5 font-mono font-semibold text-foreground">
                    {formatIntervalEstimate(interval, Boolean(isPercent), isPercent ? 2 : 3, Boolean(alreadyScaled))}
                  </td>
                  <td className="py-2.5 text-xs font-mono text-muted-foreground">
                    {formatIntervalRange(interval.ci90_low, interval.ci90_high, Boolean(isPercent), isPercent ? 2 : 3, Boolean(alreadyScaled))}
                  </td>
                  <td className="py-2.5 text-xs font-mono text-muted-foreground">
                    {formatIntervalRange(interval.ci95_low, interval.ci95_high, Boolean(isPercent), isPercent ? 2 : 3, Boolean(alreadyScaled))}
                  </td>
                  <td className="py-2.5 font-mono text-foreground">{formatPValue(data.pvalues?.[pKey])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.drawdown && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/30">
          {(['q50', 'q90', 'q95', 'q99'] as const).map((quantile) => (
            <span
              key={`${title}-${quantile}`}
              className="rounded-full border-2 border-primary/30 bg-primary/5 px-3 py-1 font-mono font-semibold"
            >
              {quantile.toUpperCase()}: {data.drawdown?.[quantile].toFixed(2)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const PerformanceMetrics = ({ results, tradeFilter }: PerformanceMetricsProps) => {
  const combined = results.performance;
  const longOnly = results.long_only;
  const shortOnly = results.short_only;
  const buyHold = results.buy_hold;
  const stressTests = results.stress_tests;

  if (!combined) {
    return null;
  }

  // Calculate win rate and total trades from actual trades data
  const allTrades = results.trades || [];
  const longTrades = allTrades.filter(t => t.side === 'long');
  const shortTrades = allTrades.filter(t => t.side === 'short');

  const combinedWinRate = allTrades.length > 0
    ? (allTrades.filter(t => t.pnl > 0).length / allTrades.length) * 100
    : 0;
  const longWinRate = longTrades.length > 0
    ? (longTrades.filter(t => t.pnl > 0).length / longTrades.length) * 100
    : 0;
  const shortWinRate = shortTrades.length > 0
    ? (shortTrades.filter(t => t.pnl > 0).length / shortTrades.length) * 100
    : 0;

  const metrics = [
    {
      name: "Total Return",
      combined: formatMetric(combined.total_return_pct ?? combined.return_pct, true),
      longOnly: formatMetric(longOnly?.total_return_pct ?? longOnly?.return_pct, true),
      shortOnly: formatMetric(shortOnly?.total_return_pct ?? shortOnly?.return_pct, true),
      buyHold: formatMetric(buyHold?.total_return_pct ?? buyHold?.return_pct, true),
      isDrawdown: false,
    },
    {
      name: "Profit Factor",
      combined: formatMetric(combined.profit_factor),
      longOnly: formatMetric(longOnly?.profit_factor),
      shortOnly: formatMetric(shortOnly?.profit_factor),
      buyHold: formatMetric(buyHold?.profit_factor),
      isDrawdown: false,
    },
    {
      name: "Sharpe Ratio",
      combined: formatMetric(combined.sharpe_ratio),
      longOnly: formatMetric(longOnly?.sharpe_ratio),
      shortOnly: formatMetric(shortOnly?.sharpe_ratio),
      buyHold: formatMetric(buyHold?.sharpe_ratio),
      isDrawdown: false,
    },
    {
      name: "Max Drawdown",
      combined: formatMetric(combined.max_drawdown ?? combined.max_drawdown_pct, true, true),
      longOnly: formatMetric(longOnly?.max_drawdown ?? longOnly?.max_drawdown_pct, true, true),
      shortOnly: formatMetric(shortOnly?.max_drawdown ?? shortOnly?.max_drawdown_pct, true, true),
      buyHold: formatMetric(buyHold?.max_drawdown ?? buyHold?.max_drawdown_pct, true, true),
      isDrawdown: true,
    },
    {
      name: "Win Rate",
      combined: formatMetric(combinedWinRate, true),
      longOnly: formatMetric(longWinRate, true),
      shortOnly: formatMetric(shortWinRate, true),
      buyHold: 'N/A',
      isDrawdown: false,
    },
    {
      name: "Total Trades",
      combined: allTrades.length.toString(),
      longOnly: longTrades.length.toString(),
      shortOnly: shortTrades.length.toString(),
      buyHold: 'N/A',
      isDrawdown: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Charts */}
      <ChartSection results={results} tradeFilter={tradeFilter} />

      {/* Performance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Performance vs Buy & Hold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead className="text-foreground font-semibold">Metric</TableHead>
                  <TableHead className={`text-foreground font-semibold ${tradeFilter === "all" ? "bg-primary/20" : ""}`}>
                    Combined {tradeFilter === "all" && "✓"}
                  </TableHead>
                  <TableHead className={`text-foreground font-semibold ${tradeFilter === "long" ? "bg-primary/20" : ""}`}>
                    Long Only {tradeFilter === "long" && "✓"}
                  </TableHead>
                  <TableHead className={`text-foreground font-semibold ${tradeFilter === "short" ? "bg-primary/20" : ""}`}>
                    Short Only {tradeFilter === "short" && "✓"}
                  </TableHead>
                  <TableHead className="text-foreground font-semibold">Buy & Hold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric, index) => (
                  <TableRow key={index} className="hover:bg-secondary/50">
                    <TableCell className="font-medium text-muted-foreground">{metric.name}</TableCell>
                    <TableCell className={`font-mono font-semibold ${
                      tradeFilter === "all" ? "bg-primary/10" : ""
                    } ${
                      metric.isDrawdown ? 'text-destructive' :
                      metric.combined.includes('+') ? 'profit-text' :
                      metric.combined.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.combined}
                    </TableCell>
                    <TableCell className={`font-mono ${
                      tradeFilter === "long" ? "bg-primary/10" : ""
                    } ${
                      metric.isDrawdown ? 'text-destructive' :
                      metric.longOnly.includes('+') ? 'profit-text' :
                      metric.longOnly.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.longOnly}
                    </TableCell>
                    <TableCell className={`font-mono ${
                      tradeFilter === "short" ? "bg-primary/10" : ""
                    } ${
                      metric.isDrawdown ? 'text-destructive' :
                      metric.shortOnly.includes('+') ? 'profit-text' :
                      metric.shortOnly.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.shortOnly}
                    </TableCell>
                    <TableCell className={`font-mono ${
                      metric.isDrawdown ? 'text-destructive' : 'text-muted-foreground'
                    }`}>{metric.buyHold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stress Test Results */}
      {stressTests && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Stress Test Results (Confidence Intervals)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {renderStressSection("Combined Strategy", stressTests.combined)}
              {renderStressSection("Long Only", stressTests.long_only)}
              {renderStressSection("Short Only", stressTests.short_only)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
