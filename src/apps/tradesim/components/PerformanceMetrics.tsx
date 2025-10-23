import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PerformanceMetrics = () => {
  const metrics = [
    { name: "Total Return", combined: "+48.49%", longOnly: "+45.37%", shortOnly: "-3.42%", buyHold: "+3.73%" },
    { name: "Profit Factor", combined: "1.17", longOnly: "1.13", shortOnly: "0.27", buyHold: "1.03" },
    { name: "Sharpe Ratio", combined: "3.67", longOnly: "6.84", shortOnly: "-2.04", buyHold: "0.22" },
    { name: "Trades", combined: "70", longOnly: "33", shortOnly: "37", buyHold: "N/A" },
    { name: "Win Rate", combined: "58.6%", longOnly: "66.7%", shortOnly: "51.4%", buyHold: "N/A" },
    { name: "Avg Win Position", combined: "936", longOnly: "957", shortOnly: "97", buyHold: "Always" },
    { name: "Max Drawdown", combined: "34.3%", longOnly: "24.0%", shortOnly: "37.4%", buyHold: "--" },
    { name: "Avg DD Duration", combined: "2.76%", longOnly: "--", shortOnly: "--", buyHold: "--" },
    { name: "Max DD Duration", combined: "16 bars", longOnly: "--", shortOnly: "--", buyHold: "--" },
  ];

  return (
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
  );
};
