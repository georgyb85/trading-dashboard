import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";

export const PerformanceCards = () => {
  const metrics = [
    {
      title: "Total Return",
      value: "+48.49%",
      change: "+11.74%",
      isPositive: true,
      icon: TrendingUp,
    },
    {
      title: "Win Rate",
      value: "60.6%",
      subtitle: "33 / 70 trades",
      icon: Target,
    },
    {
      title: "Profit Factor",
      value: "1.17",
      subtitle: "Combined",
      icon: Activity,
    },
    {
      title: "Sharpe Ratio",
      value: "3.67",
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
            <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            {metric.change && (
              <p className={`text-xs ${metric.isPositive ? 'profit-text' : 'loss-text'}`}>
                {metric.change} vs benchmark
              </p>
            )}
            {metric.subtitle && (
              <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
