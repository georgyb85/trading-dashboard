import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, WifiOff, Loader2, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { useStatusStream } from "@/hooks/useStatusStream";
import { useMemo } from "react";

export function LiveMarketData() {
  const { connected, error, stats, trades, ohlcv, lastPrices } = useStatusStream();

  // Get top symbols by activity
  const topSymbols = useMemo(() => {
    return Object.entries(lastPrices)
      .sort(([, priceA], [, priceB]) => priceB - priceA)
      .slice(0, 10);
  }, [lastPrices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Loading and error states
  if (!connected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            {error ? (
              <div className="space-y-4">
                <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Connection Error</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Connecting to Status Stream...</h3>
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
            <div className="text-2xl font-bold">{Object.keys(lastPrices).length}</div>
            <p className="text-xs text-muted-foreground">Active Symbols</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {stats?.message_rates?.trade_messages?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Trade Msgs/sec</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {trades.length}
            </div>
            <p className="text-xs text-muted-foreground">Recent Trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "default" : "destructive"}>
                {connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Status Stream</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Last Price</TableHead>
                  <TableHead>Exchange</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSymbols.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No price data available
                    </TableCell>
                  </TableRow>
                ) : (
                  topSymbols.map(([symbol, price]) => (
                    <TableRow key={symbol}>
                      <TableCell className="font-medium">{symbol}</TableCell>
                      <TableCell className="font-mono text-success text-lg">
                        {formatCurrency(price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Bybit</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.slice(-20).reverse().map((trade, idx) => (
                    <TableRow key={`${trade.symbol}-${trade.timestamp}-${idx}`}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(trade.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'Buy' ? 'default' : 'secondary'}>
                          {trade.side === 'Buy' ? (
                            <><TrendingUp className="w-3 h-3 mr-1" />BUY</>
                          ) : (
                            <>SELL</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(trade.price)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(trade.volume, 4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OHLCV Candles */}
      {ohlcv.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Candles (1m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>High</TableHead>
                    <TableHead>Low</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>VWAP</TableHead>
                    <TableHead>Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ohlcv.slice(-10).reverse().map((candle, idx) => (
                    <TableRow key={`${candle.symbol}-${candle.timestamp}-${idx}`}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(candle.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{candle.symbol}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(candle.open)}
                      </TableCell>
                      <TableCell className="font-mono text-success">
                        {formatCurrency(candle.high)}
                      </TableCell>
                      <TableCell className="font-mono text-loss">
                        {formatCurrency(candle.low)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {formatCurrency(candle.close)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(candle.volume, 2)}
                      </TableCell>
                      <TableCell className="font-mono text-primary">
                        {formatCurrency(candle.vwap)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{candle.trades}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Stats */}
      {stats && stats.thread_statuses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Thread Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.thread_statuses.map((thread, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{thread.name}</p>
                    {thread.processingRate && (
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(thread.processingRate)} msg/s
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      thread.status === 'healthy' ? 'default' :
                      thread.status === 'warning' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {thread.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
