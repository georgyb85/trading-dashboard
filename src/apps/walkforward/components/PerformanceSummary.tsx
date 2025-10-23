import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PerformanceSummaryProps {
  runs: Array<{
    run: number;
    folds: number;
    return: number;
    pfLong: number;
    pfShort: number;
    pfDual: number;
    sigLong: number;
    sigShort: number;
    sigDual: number;
    totalTrades: number;
    hitRateLong: number;
    hitRateShort: number;
    hitRateTotal: number;
    runtime: number;
  }>;
}

export const PerformanceSummary = ({ runs }: PerformanceSummaryProps) => {
  const colors = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Performance Summary</h3>
        <p className="text-sm text-muted-foreground mt-1">Fold-by-fold results across all runs</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2">
              <TableHead className="font-semibold text-foreground">Run</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Folds</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Return</TableHead>
              <TableHead className="text-right font-semibold text-foreground">PF Long</TableHead>
              <TableHead className="text-right font-semibold text-foreground">PF Short</TableHead>
              <TableHead className="text-right font-semibold text-foreground">PF Dual</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Sig Long</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Sig Short</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Sig Dual</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Total Trades</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Hit% Long</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Hit% Short</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Hit% Tot.</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Runtime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run, index) => (
              <TableRow key={run.run} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-semibold">
                  <span 
                    className="inline-flex items-center gap-2"
                  >
                    <span 
                      className="inline-block w-3 h-3 rounded-full" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    Run {run.run}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{run.folds}</TableCell>
                <TableCell className={`text-right font-semibold ${run.return > 0 ? "text-success" : "text-destructive"}`}>
                  {run.return.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right font-medium">{run.pfLong.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">{run.pfShort.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">{run.pfDual}</TableCell>
                <TableCell className="text-right font-medium">{run.sigLong}</TableCell>
                <TableCell className="text-right font-medium">{run.sigShort}</TableCell>
                <TableCell className="text-right font-medium">{run.sigDual}</TableCell>
                <TableCell className="text-right font-medium">{run.totalTrades}</TableCell>
                <TableCell className="text-right font-medium">{run.hitRateLong.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-medium">{run.hitRateShort.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-medium">{run.hitRateTotal.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-muted-foreground">{run.runtime}s</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
