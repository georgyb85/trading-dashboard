import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTrades } from "@/lib/hooks/useApi";

interface TradeTableProps {
  simulationId?: number;
  tradeType?: 'Long' | 'Short';
}

export const TradeTable = ({ simulationId, tradeType }: TradeTableProps) => {
  const { data: tradesResponse, isLoading, error } = useTrades(simulationId || 0, tradeType);

  if (!simulationId) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        <p>Select a simulation run to view trades</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="space-y-2 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load trades: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const trades = tradesResponse?.data || [];

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        <p>No trades found for this simulation</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="text-foreground font-semibold">Fold</TableHead>
              <TableHead className="text-foreground font-semibold">Type</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Time</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Time</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Price</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Price</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Signal</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Signal</TableHead>
              <TableHead className="text-foreground font-semibold">P&L</TableHead>
              <TableHead className="text-foreground font-semibold">Return %</TableHead>
              <TableHead className="text-foreground font-semibold">Cumul. Return %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <TableRow key={trade.id || index} className="hover:bg-secondary/50">
                <TableCell className="font-mono">{trade.fold_number}</TableCell>
                <TableCell className="text-primary">{trade.trade_type}</TableCell>
                <TableCell className="font-mono text-sm">{trade.entry_time}</TableCell>
                <TableCell className="font-mono text-sm">{trade.exit_time}</TableCell>
                <TableCell className="font-mono">{trade.entry_price.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.exit_price.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.entry_signal.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.exit_signal.toFixed(2)}</TableCell>
                <TableCell className={`font-mono font-semibold ${trade.pnl >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                </TableCell>
                <TableCell className={`font-mono font-semibold ${trade.return_pct >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.return_pct >= 0 ? '+' : ''}{trade.return_pct.toFixed(2)}%
                </TableCell>
                <TableCell className={`font-mono font-semibold ${trade.cumulative_return_pct >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.cumulative_return_pct >= 0 ? '+' : ''}{trade.cumulative_return_pct.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
