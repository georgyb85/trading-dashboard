import { Card } from "@/components/ui/card";
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
  ReferenceLine,
  Cell,
} from "recharts";

export const FoldResults = () => {
  // Mock data for tables and metrics
  const tradingSignals = [
    { type: "Long", signals: 1, hitRate: "0.0%", return: "-0.250087" },
    { type: "Short", signals: 1, hitRate: "0.0%", return: "-1.620836" },
    { type: "Total", signals: 2, hitRate: "0.0%", return: "-1.870813" },
  ];

  const profitFactors = [
    { dataset: "Train", allLong: "0.90", allShort: "-", long95: "50.90", longOpt: "3338.47", short5: "35.06", shortOpt: "6.80" },
    { dataset: "Test", allLong: "-0.97", allShort: "-", long95: "0.00", longOpt: "0.00", short5: "0.00", shortOpt: "0.00" },
  ];

  // ROC Curve data - random line is y=x diagonal
  const rocData = [
    { fpr: 0, tpr: 0, random: 0 },
    { fpr: 0.2, tpr: 0.15, random: 0.2 },
    { fpr: 0.4, tpr: 0.35, random: 0.4 },
    { fpr: 0.6, tpr: 0.55, random: 0.6 },
    { fpr: 0.8, tpr: 0.70, random: 0.8 },
    { fpr: 1, tpr: 1, random: 1 },
  ];

  // Feature Importance data
  const featureImportance = [
    { feature: "PRICE_MR_PROD", score: 0.95 },
    { feature: "MORLAVMS_RATIO", score: 0.89 },
    { feature: "VMAS_RATIO", score: 0.85 },
    { feature: "QTR_RATIO", score: 0.81 },
    { feature: "VOL_MAX", score: 0.76 },
    { feature: "PBOL", score: 0.71 },
    { feature: "WIDTH_BOL", score: 0.68 },
    { feature: "WIDTH_MRV_FIT", score: 0.65 },
  ];

  // Predictions vs Actuals scatter data
  const scatterData = [
    { predicted: -0.8, actual: 2, group: "sOpt" },
    { predicted: -0.4, actual: 1.5, group: "s5" },
    { predicted: -0.2, actual: 1, group: "s5" },
    { predicted: 0, actual: -0.5, group: "u=x" },
    { predicted: 0, actual: 0.2, group: "u=x" },
    { predicted: 0, actual: 0.5, group: "u=x" },
    { predicted: 0, actual: -1, group: "u=x" },
    { predicted: 0.1, actual: -0.3, group: "u=x" },
    { predicted: 0.15, actual: 1.8, group: "u=x" },
    { predicted: 0.2, actual: 2.2, group: "u=x" },
    { predicted: 0.25, actual: 1.5, group: "u=x" },
    { predicted: 0.3, actual: 0.8, group: "u=x" },
    { predicted: 0.35, actual: 2, group: "u=x" },
    { predicted: 0.4, actual: 1.2, group: "u=x" },
    { predicted: 0.8, actual: 9, group: "L95" },
    { predicted: 1, actual: 8.5, group: "LOpt" },
  ];

  // Predictions Distribution histogram data
  const histogramData = [
    { bin: -0.8, count: 1 },
    { bin: -0.6, count: 2 },
    { bin: -0.4, count: 8 },
    { bin: -0.2, count: 9 },
    { bin: 0, count: 4 },
    { bin: 0.2, count: 1 },
    { bin: 0.4, count: 1 },
    { bin: 0.6, count: 1 },
    { bin: 0.8, count: 9 },
    { bin: 1.0, count: 8 },
  ];

  const getScatterColor = (group: string) => {
    switch (group) {
      case "sOpt": return "hsl(var(--chart-1))"; // Cyan
      case "s5": return "hsl(var(--chart-2))"; // Blue
      case "L95": return "hsl(var(--chart-3))"; // Red
      case "LOpt": return "hsl(var(--chart-4))"; // Green
      default: return "hsl(var(--muted-foreground))"; // Gray
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Metrics */}
        <div className="space-y-4">
          {/* Trading Signals */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Trading Signals:</h4>
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
                {tradingSignals.map((signal) => (
                  <TableRow key={signal.type}>
                    <TableCell className="font-medium">{signal.type}</TableCell>
                    <TableCell className="text-center">{signal.signals}</TableCell>
                    <TableCell className="text-center">{signal.hitRate}</TableCell>
                    <TableCell className={`text-right ${parseFloat(signal.return) < 0 ? "text-loss" : "text-success"}`}>
                      {signal.return}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* ROC-based Metrics */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">ROC-based Metrics:</h4>
            <div className="space-y-1 text-sm">
              <div>ROC AUC: 0.2692</div>
              <div>R-squared: -0.2140</div>
            </div>
            <Separator className="my-3" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="font-semibold">Thresholds:</div>
              <div>Long - 95th percentile: 0.798373</div>
              <div>Long - Optimal (ROC): 1.637181</div>
              <div>Short - 5th percentile: -0.414585</div>
              <div>Short - Optimal: -2.043877</div>
            </div>
          </Card>

          {/* Profit Factors */}
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Profit Factors:</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead className="text-center">All Long</TableHead>
                    <TableHead className="text-center">All Short</TableHead>
                    <TableHead className="text-center">Long 95%</TableHead>
                    <TableHead className="text-center">Long Opt</TableHead>
                    <TableHead className="text-center">Short 5%</TableHead>
                    <TableHead className="text-center">Short Opt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitFactors.map((pf) => (
                    <TableRow key={pf.dataset}>
                      <TableCell className="font-medium">{pf.dataset}</TableCell>
                      <TableCell className="text-center">{pf.allLong}</TableCell>
                      <TableCell className="text-center">{pf.allShort}</TableCell>
                      <TableCell className="text-center">{pf.long95}</TableCell>
                      <TableCell className="text-center">{pf.longOpt}</TableCell>
                      <TableCell className="text-center">{pf.short5}</TableCell>
                      <TableCell className="text-center">{pf.shortOpt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
            Note: Test Model uses fixed seed (43) for exact reproducibility. Results should match the original fold exactly when all parameters are preserved.
          </p>
        </div>

        {/* Right Column - Charts */}
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">ROC Curve</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rocData} margin={{ left: 20, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="fpr" 
                  label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 5 }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="stepAfter" 
                  dataKey="tpr" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="ROC"
                  dot={false}
                />
                <Line 
                  type="linear" 
                  dataKey="random" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Random"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-muted-foreground">
              ROC AUC: 0.2692, R-squared: -0.2140
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Feature Importance</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={featureImportance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  domain={[0, 1]}
                  label={{ value: 'Importance Score', position: 'insideBottom', offset: -5 }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="feature"
                  width={120}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="score" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Predictions vs Actuals</h4>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  dataKey="predicted"
                  domain={[-1, 1.5]}
                  label={{ value: 'Predicted', position: 'insideBottom', offset: -5 }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="actual"
                  domain={[-3, 10]}
                  label={{ value: 'Actual', angle: -90, position: 'insideLeft' }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Legend />
                <ReferenceLine x={-0.8} stroke="hsl(var(--chart-1))" strokeWidth={2} label="SOpt" />
                <ReferenceLine x={-0.4} stroke="hsl(var(--chart-2))" strokeWidth={2} label="S5" />
                <ReferenceLine x={0.8} stroke="hsl(var(--chart-3))" strokeWidth={2} label="L95" />
                <ReferenceLine x={1} stroke="hsl(var(--chart-4))" strokeWidth={2} label="LOpt" />
                <Scatter name="Predictions" data={scatterData} fill="hsl(var(--chart-2))">
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScatterColor(entry.group)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3 text-sm">Predictions Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="bin"
                  label={{ value: 'Prediction Value', position: 'insideBottom', offset: -5 }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <ReferenceLine x={-0.8} stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <ReferenceLine x={-0.4} stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <ReferenceLine x={0.8} stroke="hsl(var(--chart-3))" strokeWidth={2} />
                <ReferenceLine x={1} stroke="hsl(var(--chart-4))" strokeWidth={2} />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-muted-foreground">
              Min: -0.476293, Max: 1.297513, Mean: -0.038417
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
