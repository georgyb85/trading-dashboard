import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockTrades = [
  { fold: 42, type: "Long", entryTime: "2025-04-24 01:00", exitTime: "2025-04-26 03:00", entryPrice: 150.18, exitPrice: 151.36, entrySignal: 3.64, exitSignal: 3.26, pnl: 7.86, return: 0.79, cumulReturn: 26.39 },
  { fold: 40, type: "Long", entryTime: "2025-04-22 01:00", exitTime: "2025-04-26 03:00", entryPrice: 146.34, exitPrice: 147.40, entrySignal: 4.83, exitSignal: 3.40, pnl: 7.05, return: 0.72, cumulReturn: 25.13 },
  { fold: 20, type: "Long", entryTime: "2025-05-02 00:00", exitTime: "2025-05-05 20:00", entryPrice: 151.45, exitPrice: 147.68, entrySignal: 3.79, exitSignal: 2.54, pnl: -25.30, return: -2.49, cumulReturn: 24.63 },
  { fold: 54, type: "Long", entryTime: "2025-05-06 04:00", exitTime: "2025-05-08 04:00", entryPrice: 144.75, exitPrice: 150.97, entrySignal: 3.82, exitSignal: 1.16, pnl: 40.84, return: 4.30, cumulReturn: 19.70 },
  { fold: 55, type: "Long", entryTime: "2025-05-07 18:00", exitTime: "2025-05-09 22:00", entryPrice: 147.48, exitPrice: 149.32, entrySignal: 3.70, exitSignal: 1.05, pnl: 12.13, return: 1.25, cumulReturn: 16.26 },
  { fold: 58, type: "Long", entryTime: "2025-05-09 23:00", exitTime: "2025-05-12 01:00", entryPrice: 149.77, exitPrice: 153.74, entrySignal: 3.39, exitSignal: 3.07, pnl: 26.15, return: 2.65, cumulReturn: 32.92 },
  { fold: 71, type: "Long", entryTime: "2025-05-25 14:00", exitTime: "2025-05-26 16:00", entryPrice: 176.77, exitPrice: 176.39, entrySignal: 4.40, exitSignal: 3.74, pnl: -2.51, return: -0.21, cumulReturn: 30.50 },
  { fold: 77, type: "Long", entryTime: "2025-05-30 10:00", exitTime: "2025-05-30 16:00", entryPrice: 163.83, exitPrice: 158.48, entrySignal: 4.66, exitSignal: 4.65, pnl: -28.16, return: -3.31, cumulReturn: 30.28 },
  { fold: 77, type: "Long", entryTime: "2025-05-30 10:00", exitTime: "2025-05-31 01:00", entryPrice: 160.41, exitPrice: 154.31, entrySignal: 4.59, exitSignal: 4.59, pnl: -32.10, return: -3.80, cumulReturn: 26.40 },
];

export const TradeTable = () => {
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
            {mockTrades.map((trade, index) => (
              <TableRow key={index} className="hover:bg-secondary/50">
                <TableCell className="font-mono">{trade.fold}</TableCell>
                <TableCell className="text-primary">{trade.type}</TableCell>
                <TableCell className="font-mono text-sm">{trade.entryTime}</TableCell>
                <TableCell className="font-mono text-sm">{trade.exitTime}</TableCell>
                <TableCell className="font-mono">{trade.entryPrice.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.exitPrice.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.entrySignal.toFixed(2)}</TableCell>
                <TableCell className="font-mono">{trade.exitSignal.toFixed(2)}</TableCell>
                <TableCell className={`font-mono font-semibold ${trade.pnl >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                </TableCell>
                <TableCell className={`font-mono font-semibold ${trade.return >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.return >= 0 ? '+' : ''}{trade.return.toFixed(2)}%
                </TableCell>
                <TableCell className={`font-mono font-semibold ${trade.cumulReturn >= 0 ? 'profit-text' : 'loss-text'}`}>
                  {trade.cumulReturn >= 0 ? '+' : ''}{trade.cumulReturn.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
