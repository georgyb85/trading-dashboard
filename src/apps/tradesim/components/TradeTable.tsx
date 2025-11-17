import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { Trade } from "@/lib/stage1/types";

interface TradeTableProps {
  trades: Trade[];
}

export const TradeTable = ({ trades }: TradeTableProps) => {
  const handleExportToExcel = () => {
    // Prepare data for Excel export
    const exportData = trades.map((trade) => ({
      Fold: trade.fold,
      Side: trade.side.charAt(0).toUpperCase() + trade.side.slice(1),
      "Entry Time": new Date(trade.entry_time).toLocaleString(),
      "Exit Time": new Date(trade.exit_time).toLocaleString(),
      "Entry Price": trade.entry_price,
      "Exit Price": trade.exit_price,
      "Entry Signal": trade.entry_signal,
      "Exit Signal": trade.exit_signal,
      "Exit Reason": trade.exit_reason.replace(/_/g, " "),
      "P&L": trade.pnl,
      "Return %": trade.return_pct,
      "Cumulative Return %": trade.cumulative_return_pct,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 8 },  // Fold
      { wch: 8 },  // Side
      { wch: 20 }, // Entry Time
      { wch: 20 }, // Exit Time
      { wch: 12 }, // Entry Price
      { wch: 12 }, // Exit Price
      { wch: 12 }, // Entry Signal
      { wch: 12 }, // Exit Signal
      { wch: 15 }, // Exit Reason
      { wch: 12 }, // P&L
      { wch: 12 }, // Return %
      { wch: 18 }, // Cumulative Return %
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trades");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `trades_${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
  };

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No trades to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportToExcel}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Trade Table */}
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
                  <span className={`px-2 py-1 rounded font-medium ${
                    trade.exit_reason === 'take_profit' ? 'bg-success/20 text-success border border-success/30' :
                    trade.exit_reason === 'stop_loss' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                    trade.exit_reason === 'time_exit' ? 'bg-warning/20 text-warning border border-warning/30' :
                    'bg-primary/20 text-primary border border-primary/30'
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
    </div>
  );
};
