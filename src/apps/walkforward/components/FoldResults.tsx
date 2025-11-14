import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { XGBoostTrainResult } from "@/lib/types/xgboost";
import {
  buildHistogram,
  buildScatterData,
  computeRocCurve,
  computeTradingSignals,
} from "@/lib/utils/xgboostMetrics";

interface FoldResultsProps {
  result?: XGBoostTrainResult | null;
  isLoading?: boolean;
  error?: string | null;
}

const numberFormatter = (value: number, digits = 4) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

export const FoldResults = ({ result, isLoading, error }: FoldResultsProps) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Training on GPU – this usually takes a few seconds…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No fold selected for examination
      </div>
    );
  }

  const testPredictions = result.predictions?.test ?? [];
  const testActuals = result.actuals?.test ?? [];
  const roc = computeRocCurve(testPredictions, testActuals);
  const rocChartData = roc.points.map((point) => ({
    ...point,
    random: point.fpr,
  }));
  const trading = computeTradingSignals(testPredictions, testActuals, result.thresholds ?? {});
  const histogramData = buildHistogram(testPredictions);
  const scatterData = buildScatterData(testPredictions, testActuals);

  const profitFactors = [
    {
      dataset: "Train",
      allLong: result.profit_factors?.train_long ?? 0,
      longOpt: result.profit_factors?.train_long_opt ?? 0,
      allShort: result.profit_factors?.train_short ?? 0,
      shortOpt: result.profit_factors?.train_short_opt ?? 0,
    },
    {
      dataset: "Test",
      allLong: result.profit_factors?.test_long ?? 0,
      longOpt: result.profit_factors?.test_long_opt ?? 0,
      allShort: result.profit_factors?.test_short ?? 0,
      shortOpt: result.profit_factors?.test_short_opt ?? 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Trading Signals (Test Set)</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Signals</TableHead>
                  <TableHead className="text-center">Hit Rate</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Long</TableCell>
                  <TableCell className="text-center">{trading.long.signals}</TableCell>
                  <TableCell className="text-center">
                    {(trading.long.hitRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {numberFormatter(trading.long.cumulativeReturn)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Short</TableCell>
                  <TableCell className="text-center">{trading.short.signals}</TableCell>
                  <TableCell className="text-center">
                    {(trading.short.hitRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {numberFormatter(trading.short.cumulativeReturn)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-center">{trading.total.signals}</TableCell>
                  <TableCell className="text-center">
                    {(trading.total.hitRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {numberFormatter(trading.total.cumulativeReturn)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">ROC & Metrics</h4>
            <div className="text-sm space-y-1">
              <div>ROC AUC: {numberFormatter(roc.auc, 3)}</div>
              <div>
                R-squared (test): {numberFormatter(result.test_metrics?.r2 ?? result.validation_metrics?.r2 ?? 0, 3)}
              </div>
            </div>
            <Separator />
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Thresholds</div>
              <div>Long – 95th percentile: {numberFormatter(result.thresholds?.long_percentile_95 ?? 0)}</div>
              <div>Long – Optimal: {numberFormatter(result.thresholds?.long_optimal ?? 0)}</div>
              <div>Short – 5th percentile: {numberFormatter(result.thresholds?.short_percentile_05 ?? 0)}</div>
              <div>Short – Optimal: {numberFormatter(result.thresholds?.short_optimal ?? 0)}</div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Profit Factors</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead className="text-center">Long (P95)</TableHead>
                    <TableHead className="text-center">Long (Opt)</TableHead>
                    <TableHead className="text-center">Short (P5)</TableHead>
                    <TableHead className="text-center">Short (Opt)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitFactors.map((row) => (
                    <TableRow key={row.dataset}>
                      <TableCell className="font-medium">{row.dataset}</TableCell>
                      <TableCell className="text-center">{numberFormatter(row.allLong, 2)}</TableCell>
                      <TableCell className="text-center">{numberFormatter(row.longOpt, 2)}</TableCell>
                      <TableCell className="text-center">{numberFormatter(row.allShort, 2)}</TableCell>
                      <TableCell className="text-center">{numberFormatter(row.shortOpt, 2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">ROC Curve</h4>
            {roc.points.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rocChartData} margin={{ left: 20, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 5 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="stepAfter" dataKey="tpr" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="ROC" />
                  <Line type="linear" dataKey="random" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} name="Random" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Not enough data to build ROC curve.</p>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Predictions vs Actuals</h4>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="predicted" name="Predicted" />
                  <YAxis type="number" dataKey="actual" name="Actual" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Test points" data={scatterData} fill="hsl(var(--chart-3))" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Awaiting predictions…</p>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Prediction Distribution</h4>
            {histogramData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bin" tickFormatter={(value) => value.toFixed(2)} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value} samples`, 'Count']} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Awaiting predictions…</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
