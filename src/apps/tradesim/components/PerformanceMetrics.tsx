import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimulateTradesResponse, PerformanceMetrics as Metrics } from "@/lib/stage1/types";

interface PerformanceMetricsProps {
  results: SimulateTradesResponse;
}

const formatMetric = (value: any, isPercent: boolean = false): string => {
  if (value === null || value === undefined) return '--';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '--';

  if (isPercent) {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  }
  return num.toFixed(2);
};

export const PerformanceMetrics = ({ results }: PerformanceMetricsProps) => {
  const combined = results.performance;
  const longOnly = results.long_only;
  const shortOnly = results.short_only;
  const buyHold = results.buy_hold;
  const stressTests = results.stress_tests;

  if (!combined) {
    return null;
  }

  const metrics = [
    {
      name: "Total Return",
      combined: formatMetric(combined.total_return_pct ?? combined.return_pct, true),
      longOnly: formatMetric(longOnly?.total_return_pct ?? longOnly?.return_pct, true),
      shortOnly: formatMetric(shortOnly?.total_return_pct ?? shortOnly?.return_pct, true),
      buyHold: formatMetric(buyHold?.total_return_pct ?? buyHold?.return_pct, true),
    },
    {
      name: "Profit Factor",
      combined: formatMetric(combined.profit_factor),
      longOnly: formatMetric(longOnly?.profit_factor),
      shortOnly: formatMetric(shortOnly?.profit_factor),
      buyHold: formatMetric(buyHold?.profit_factor),
    },
    {
      name: "Sharpe Ratio",
      combined: formatMetric(combined.sharpe_ratio),
      longOnly: formatMetric(longOnly?.sharpe_ratio),
      shortOnly: formatMetric(shortOnly?.sharpe_ratio),
      buyHold: formatMetric(buyHold?.sharpe_ratio),
    },
    {
      name: "Max Drawdown",
      combined: formatMetric(combined.max_drawdown ?? combined.max_drawdown_pct, true),
      longOnly: formatMetric(longOnly?.max_drawdown ?? longOnly?.max_drawdown_pct, true),
      shortOnly: formatMetric(shortOnly?.max_drawdown ?? shortOnly?.max_drawdown_pct, true),
      buyHold: formatMetric(buyHold?.max_drawdown ?? buyHold?.max_drawdown_pct, true),
    },
    {
      name: "Win Rate",
      combined: formatMetric((combined.win_rate || 0) * 100, true),
      longOnly: formatMetric((longOnly?.win_rate || 0) * 100, true),
      shortOnly: formatMetric((shortOnly?.win_rate || 0) * 100, true),
      buyHold: 'N/A',
    },
    {
      name: "Total Trades",
      combined: combined.total_trades?.toString() || '--',
      longOnly: longOnly?.total_trades?.toString() || '--',
      shortOnly: shortOnly?.total_trades?.toString() || '--',
      buyHold: 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
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
                  <TableHead className="text-foreground font-semibold">Combined</TableHead>
                  <TableHead className="text-foreground font-semibold">Long Only</TableHead>
                  <TableHead className="text-foreground font-semibold">Short Only</TableHead>
                  <TableHead className="text-foreground font-semibold">Buy & Hold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric, index) => (
                  <TableRow key={index} className="hover:bg-secondary/50">
                    <TableCell className="font-medium text-muted-foreground">{metric.name}</TableCell>
                    <TableCell className={`font-mono font-semibold ${
                      metric.combined.includes('+') ? 'profit-text' :
                      metric.combined.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.combined}
                    </TableCell>
                    <TableCell className={`font-mono ${
                      metric.longOnly.includes('+') ? 'profit-text' :
                      metric.longOnly.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.longOnly}
                    </TableCell>
                    <TableCell className={`font-mono ${
                      metric.shortOnly.includes('+') ? 'profit-text' :
                      metric.shortOnly.includes('-') ? 'loss-text' :
                      'text-foreground'
                    }`}>
                      {metric.shortOnly}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{metric.buyHold}</TableCell>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Combined */}
              {stressTests.combined && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Combined Strategy</h4>
                  <div className="space-y-2 text-sm">
                    {stressTests.combined.sharpe && stressTests.combined.sharpe.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Sharpe Ratio</div>
                        <div className="font-mono">Est: {stressTests.combined.sharpe.estimate.toFixed(3)}</div>
                        {stressTests.combined.sharpe.ci90_low !== undefined && stressTests.combined.sharpe.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{stressTests.combined.sharpe.ci90_low.toFixed(3)}, {stressTests.combined.sharpe.ci90_high.toFixed(3)}]
                          </div>
                        )}
                        {stressTests.combined.sharpe.ci95_low !== undefined && stressTests.combined.sharpe.ci95_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            95% CI: [{stressTests.combined.sharpe.ci95_low.toFixed(3)}, {stressTests.combined.sharpe.ci95_high.toFixed(3)}]
                          </div>
                        )}
                      </div>
                    )}
                    {stressTests.combined.max_drawdown && stressTests.combined.max_drawdown.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Max Drawdown</div>
                        <div className="font-mono">{(stressTests.combined.max_drawdown.estimate * 100).toFixed(2)}%</div>
                        {stressTests.combined.max_drawdown.ci90_low !== undefined && stressTests.combined.max_drawdown.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{(stressTests.combined.max_drawdown.ci90_low * 100).toFixed(2)}%, {(stressTests.combined.max_drawdown.ci90_high * 100).toFixed(2)}%]
                          </div>
                        )}
                        {stressTests.combined.max_drawdown.ci95_low !== undefined && stressTests.combined.max_drawdown.ci95_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            95% CI: [{(stressTests.combined.max_drawdown.ci95_low * 100).toFixed(2)}%, {(stressTests.combined.max_drawdown.ci95_high * 100).toFixed(2)}%]
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Long Only */}
              {stressTests.long_only && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Long Only</h4>
                  <div className="space-y-2 text-sm">
                    {stressTests.long_only.sharpe && stressTests.long_only.sharpe.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Sharpe Ratio</div>
                        <div className="font-mono">Est: {stressTests.long_only.sharpe.estimate.toFixed(3)}</div>
                        {stressTests.long_only.sharpe.ci90_low !== undefined && stressTests.long_only.sharpe.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{stressTests.long_only.sharpe.ci90_low.toFixed(3)}, {stressTests.long_only.sharpe.ci90_high.toFixed(3)}]
                          </div>
                        )}
                      </div>
                    )}
                    {stressTests.long_only.max_drawdown && stressTests.long_only.max_drawdown.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Max Drawdown</div>
                        <div className="font-mono">{(stressTests.long_only.max_drawdown.estimate * 100).toFixed(2)}%</div>
                        {stressTests.long_only.max_drawdown.ci90_low !== undefined && stressTests.long_only.max_drawdown.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{(stressTests.long_only.max_drawdown.ci90_low * 100).toFixed(2)}%, {(stressTests.long_only.max_drawdown.ci90_high * 100).toFixed(2)}%]
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Short Only */}
              {stressTests.short_only && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Short Only</h4>
                  <div className="space-y-2 text-sm">
                    {stressTests.short_only.sharpe && stressTests.short_only.sharpe.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Sharpe Ratio</div>
                        <div className="font-mono">Est: {stressTests.short_only.sharpe.estimate.toFixed(3)}</div>
                        {stressTests.short_only.sharpe.ci90_low !== undefined && stressTests.short_only.sharpe.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{stressTests.short_only.sharpe.ci90_low.toFixed(3)}, {stressTests.short_only.sharpe.ci90_high.toFixed(3)}]
                          </div>
                        )}
                      </div>
                    )}
                    {stressTests.short_only.max_drawdown && stressTests.short_only.max_drawdown.estimate !== undefined && (
                      <div>
                        <div className="text-muted-foreground">Max Drawdown</div>
                        <div className="font-mono">{(stressTests.short_only.max_drawdown.estimate * 100).toFixed(2)}%</div>
                        {stressTests.short_only.max_drawdown.ci90_low !== undefined && stressTests.short_only.max_drawdown.ci90_high !== undefined && (
                          <div className="font-mono text-xs text-muted-foreground">
                            90% CI: [{(stressTests.short_only.max_drawdown.ci90_low * 100).toFixed(2)}%, {(stressTests.short_only.max_drawdown.ci90_high * 100).toFixed(2)}%]
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
