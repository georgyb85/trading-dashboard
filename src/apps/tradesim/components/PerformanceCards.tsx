import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import type { SimulateTradesResponse, Trade } from "@/lib/stage1/types";

interface PerformanceCardsProps {
  results: SimulateTradesResponse;
  tradeFilter: "all" | "long" | "short";
  filteredTrades: Trade[];
}

export const PerformanceCards = ({ results, tradeFilter, filteredTrades }: PerformanceCardsProps) => {
  // Select the appropriate performance metrics based on filter
  const performance = tradeFilter === "all"
    ? results.performance
    : tradeFilter === "long"
      ? results.long_only
      : results.short_only;
  const buyHold = results.buy_hold;

  // Calculate win rate from filtered trades (more accurate than API metrics)
  const winRate = filteredTrades.length > 0
    ? (filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length) * 100
    : 0;

  console.log('[PerformanceCards] Performance data:', performance);
  console.log('[PerformanceCards] Buy&Hold data:', buyHold);

  if (!performance) {
    return null;
  }

  // Handle both field name variants from backend
  const totalReturn = performance.total_return_pct ?? performance.return_pct ?? 0;
  const buyHoldReturn = buyHold?.total_return_pct ?? buyHold?.return_pct ?? 0;
  const outperformance = totalReturn - buyHoldReturn;

  console.log('[PerformanceCards] Total return:', totalReturn);
  console.log('[PerformanceCards] Buy&Hold return:', buyHoldReturn);
  console.log('[PerformanceCards] Outperformance:', outperformance);

  const metrics = [
    {
      title: "Total Return",
      value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`,
      change: `${outperformance >= 0 ? '+' : ''}${outperformance.toFixed(2)}%`,
      subtitle: "vs buy & hold",
      isPositive: totalReturn >= 0,
      changePositive: outperformance >= 0,
      icon: totalReturn >= 0 ? TrendingUp : TrendingDown,
    },
    {
      title: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subtitle: `${filteredTrades.length} trades`,
      icon: Target,
    },
    {
      title: "Profit Factor",
      value: (performance.profit_factor || 0).toFixed(2),
      subtitle: "Combined",
      icon: Activity,
    },
    {
      title: "Sharpe Ratio",
      value: (performance.sharpe_ratio || 0).toFixed(2),
      subtitle: "Risk-adjusted",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metric.isPositive !== undefined
                ? (metric.isPositive ? 'profit-text' : 'loss-text')
                : 'text-foreground'
            }`}>
              {metric.value}
            </div>
            {metric.change && (
              <p className={`text-xs ${metric.changePositive ? 'profit-text' : 'loss-text'}`}>
                {metric.change} {metric.subtitle}
              </p>
            )}
            {!metric.change && metric.subtitle && (
              <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
