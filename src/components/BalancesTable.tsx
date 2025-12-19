import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, WifiOff, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useAccountStateContext } from "@/contexts/AccountStateContext";
import { useMemo } from "react";

export function BalancesTable() {
  const { balances, connected, error } = useAccountStateContext();

  // Compute totals and sort by total value
  const enrichedBalances = useMemo(() => {
    return balances
      .map(balance => ({
        ...balance,
        totalNum: parseFloat(balance.total),
        availableNum: parseFloat(balance.available),
        holdNum: parseFloat(balance.hold)
      }))
      .sort((a, b) => b.totalNum - a.totalNum);
  }, [balances]);

  const totalAssets = enrichedBalances.reduce((sum, b) => sum + b.totalNum, 0);
  const totalAvailable = enrichedBalances.reduce((sum, b) => sum + b.availableNum, 0);
  const totalHold = enrichedBalances.reduce((sum, b) => sum + b.holdNum, 0);

  const formatNumber = (value: number, decimals: number = 8) => {
    return value.toFixed(decimals);
  };

  const formatTime = (ns: number) => {
    const date = new Date(ns / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3, // Show milliseconds
      hour12: false
    });
  };

  // Show cached data immediately, only block if error and no data
  const hasCachedData = balances.length > 0;

  if (!connected && !hasCachedData && error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Connection Error</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
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
            <div className="text-2xl font-bold">{enrichedBalances.length}</div>
            <p className="text-xs text-muted-foreground">Assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {formatNumber(totalAvailable, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Total Available</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">
              {formatNumber(totalHold, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Total Hold</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {!connected && !error ? (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting...
                </Badge>
              ) : (
                <Badge variant={connected ? "default" : "destructive"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Account State</p>
          </CardContent>
        </Card>
      </div>

      {/* Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Hold</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No balances available
                    </TableCell>
                  </TableRow>
                ) : (
                  enrichedBalances.map((balance) => (
                    <TableRow key={balance.asset} className="hover:bg-secondary/20">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{balance.asset}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(balance.totalNum)}
                      </TableCell>
                      <TableCell className="font-mono profit-text">
                        {formatNumber(balance.availableNum)}
                      </TableCell>
                      <TableCell className="font-mono text-warning">
                        {formatNumber(balance.holdNum)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{balance.source}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(balance.lastUpdateNs)}
                      </TableCell>
                      <TableCell>
                        {balance.delta ? (
                          <div className="flex flex-col gap-1">
                            {balance.delta.total && parseFloat(balance.delta.total) !== 0 && (
                              <div className="flex items-center gap-1 text-xs">
                                {parseFloat(balance.delta.total) > 0 ? (
                                  <TrendingUp className="h-3 w-3 profit-text" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 loss-text" />
                                )}
                                <span className={parseFloat(balance.delta.total) > 0 ? "profit-text" : "loss-text"}>
                                  {balance.delta.total}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
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
