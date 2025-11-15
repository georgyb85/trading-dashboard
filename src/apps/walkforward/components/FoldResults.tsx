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

  console.log('[FoldResults] Test predictions:', testPredictions.length, 'samples');
  console.log('[FoldResults] Test actuals:', testActuals.length, 'samples');
  console.log('[FoldResults] Thresholds:', result.thresholds);
  console.log('[FoldResults] Timings:', result.timings);
  console.log('[FoldResults] Feature importance:', result.feature_importance?.length ?? 0, 'features');
  console.log('[FoldResults] Sample predictions:', testPredictions.slice(0, 5));
  console.log('[FoldResults] Sample actuals:', testActuals.slice(0, 5));

  // ROC curve data
  const rocChartData = roc.points.map((point) => ({
    ...point,
  }));

  // Separate diagonal line data for y=x reference
  const rocDiagonalLine = [
    { fpr: 0, tpr: 0 },
    { fpr: 1, tpr: 1 },
  ];

  const trading = computeTradingSignals(testPredictions, testActuals, result.thresholds ?? {});
  console.log('[FoldResults] Trading signals computed:', trading);
  const histogramData = buildHistogram(testPredictions);
  const scatterData = buildScatterData(testPredictions, testActuals);

  // Process feature importance data
  const featureImportanceData = result.feature_importance
    ? result.feature_importance
        .map(item => ({ feature: item.feature, importance: item.score }))
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 15) // Top 15 features
    : [];

  // Calculate axis domains based on actual data range
  const predictedValues = scatterData.map(d => d.predicted);
  const actualValues = scatterData.map(d => d.actual);
  const minPredicted = predictedValues.length > 0 ? Math.min(...predictedValues) : 0;
  const maxPredicted = predictedValues.length > 0 ? Math.max(...predictedValues) : 1;
  const minActual = actualValues.length > 0 ? Math.min(...actualValues) : 0;
  const maxActual = actualValues.length > 0 ? Math.max(...actualValues) : 1;

  console.log('[FoldResults] Predicted range:', minPredicted, 'to', maxPredicted);
  console.log('[FoldResults] Actual range:', minActual, 'to', maxActual);

  // Diagonal line should only extend through the predicted range (x-axis)
  // Since we're showing prediction quality, the diagonal is only meaningful
  // within the range of values the model actually predicts
  const diagonalLine = [
    { predicted: minPredicted, actual: minPredicted },
    { predicted: maxPredicted, actual: maxPredicted },
  ];

  console.log('[FoldResults] Diagonal line:', diagonalLine);

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
            {result.timings && (
              <>
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">Timings</div>
                  <div>Training: {result.timings.training_ms.toLocaleString()} ms</div>
                  <div>Inference: {result.timings.inference_ms.toLocaleString()} ms</div>
                </div>
              </>
            )}
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
                <LineChart margin={{ left: 20, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="fpr"
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 5 }}
                  />
                  <Tooltip formatter={(value: number) => value.toFixed(4)} />
                  <Legend />
                  <Line type="stepAfter" dataKey="tpr" data={rocChartData} stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="ROC" />
                  <Line type="linear" dataKey="tpr" data={rocDiagonalLine} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Random" />
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
                <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="predicted"
                    name="Predicted"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ value: 'Predicted', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="actual"
                    name="Actual"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => value.toFixed(2)}
                    label={{ value: 'Actual', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => [value.toFixed(4), name]}
                  />
                  <Scatter data={scatterData} fill="hsl(var(--chart-3))" />
                  <Scatter
                    data={diagonalLine}
                    fill="none"
                    shape={() => null}
                    line={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "5 5", strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
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
                  <XAxis dataKey="bin" tickFormatter={(value) => Number(value).toFixed(2)} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value} samples`, 'Count']} />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Awaiting predictions…</p>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Feature Importance (Top 15)</h4>
            {featureImportanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={featureImportanceData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value.toFixed(4), 'Importance']} />
                  <Bar dataKey="importance" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Feature importance data not available</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
