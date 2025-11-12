import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Trade } from "@/lib/stage1/types";

interface TradeTableProps {
  trades: Trade[];
}

export const TradeTable = ({ trades }: TradeTableProps) => {
  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No trades to display</p>
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
              <TableHead className="text-foreground font-semibold">Side</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Time</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Time</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Price</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Price</TableHead>
              <TableHead className="text-foreground font-semibold">Entry Signal</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Signal</TableHead>
              <TableHead className="text-foreground font-semibold">Exit Reason</TableHead>
              <TableHead className="text-foreground font-semibold">P&L</TableHead>
              <TableHead className="text-foreground font-semibold">Return %</TableHead>
              <TableHead className="text-foreground font-semibold">Cumul. Return %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade, index) => (
              <TableRow key={index} className="hover:bg-secondary/50">
                <TableCell className="font-mono">{trade.fold}</TableCell>
                <TableCell className={trade.side === 'long' ? 'text-green-600' : 'text-red-600'}>
                  {trade.side.charAt(0).toUpperCase() + trade.side.slice(1)}
                </TableCell>
                <TableCell className="font-mono text-sm">{new Date(trade.entry_time).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-sm">{new Date(trade.exit_time).toLocaleString()}</TableCell>
                <TableCell className="font-mono">{trade.entry_price.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.exit_price.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.entry_signal.toFixed(3)}</TableCell>
                <TableCell className="font-mono">{trade.exit_signal.toFixed(3)}</TableCell>
                <TableCell className="text-xs">
                  <span className={`px-2 py-1 rounded ${
                    trade.exit_reason === 'take_profit' ? 'bg-green-900/30 text-green-400' :
                    trade.exit_reason === 'stop_loss' ? 'bg-red-900/30 text-red-400' :
                    trade.exit_reason === 'time_exit' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {trade.exit_reason.replace(/_/g, ' ')}
                  </span>
                </TableCell>
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
