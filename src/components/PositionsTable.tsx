import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, X, WifiOff, Loader2 } from "lucide-react";
import { useAccountState } from "@/hooks/useAccountState";
import { useStatusStream } from "@/hooks/useStatusStream";

export function PositionsTable() {
  const { positions, connected: accountConnected, error: accountError } = useAccountState();
  const { lastPrices } = useStatusStream();

  // Compute derived data
  const enrichedPositions = useMemo(() => {
    return positions.map(pos => {
      const entryPrice = parseFloat(pos.entryPrice);
      const size = parseFloat(pos.size);
      const pnl = parseFloat(pos.pnl);

      // Try to get current price from live stream, fallback to mark price
      const currentPrice = lastPrices[pos.symbol] || parseFloat(pos.markPrice);

      const notionalValue = currentPrice * size;
      const pnlPercent = entryPrice > 0 ? (pnl / (entryPrice * size)) * 100 : 0;

      return {
        ...pos,
        currentPrice,
        entryPriceNum: entryPrice,
        sizeNum: size,
        pnlNum: pnl,
        notionalValue,
        pnlPercent
      };
    });
  }, [positions, lastPrices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalPnL = enrichedPositions.reduce((sum, pos) => sum + pos.pnlNum, 0);
  const totalNotional = enrichedPositions.reduce((sum, pos) => sum + pos.notionalValue, 0);

  // Loading and error states
  if (!accountConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            {accountError ? (
              <div className="space-y-4">
                <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Connection Error</h3>
                  <p className="text-sm text-muted-foreground">{accountError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Connecting to Account State...</h3>
                  <p className="text-sm text-muted-foreground">Please wait</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{enrichedPositions.length}</div>
            <p className="text-xs text-muted-foreground">Open Positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-success" : "text-loss"}`}>
              {formatCurrency(totalPnL)}
            </div>
            <p className="text-xs text-muted-foreground">Total P&L</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalNotional)}</div>
            <p className="text-xs text-muted-foreground">Total Notional</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant={accountConnected ? "default" : "destructive"}>
                {accountConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Account State</p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Notional</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>ML Signal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {enrichedPositions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No open positions
                    </TableCell>
                  </TableRow>
                ) : (
                  enrichedPositions.map((position) => (
                    <TableRow key={position.id} className="hover:bg-secondary/20">
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Kraken</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.side === 'Long' ? 'default' : 'secondary'}>
                          {position.side === 'Long' ? (
                            <><TrendingUp className="w-3 h-3 mr-1" />LONG</>
                          ) : (
                            <><TrendingDown className="w-3 h-3 mr-1" />SHORT</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(position.entryPriceNum)}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell>{position.sizeNum.toFixed(4)}</TableCell>
                      <TableCell>{formatCurrency(position.notionalValue)}</TableCell>
                      <TableCell>
                        <div className={`font-medium ${position.pnlNum >= 0 ? "profit-text" : "loss-text"}`}>
                          <div>{formatCurrency(position.pnlNum)}</div>
                          <div className="text-xs">{formatPercent(position.pnlPercent)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {position.leverage ? `${position.leverage}x` : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-muted-foreground">
                          -
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="text-xs">
                          OPEN
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          title="Close Position"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
