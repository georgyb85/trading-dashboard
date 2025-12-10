import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Cpu, Wifi, WifiOff, TrendingUp, Clock, BarChart2 } from 'lucide-react';
import { useStatusStream } from '@/hooks/useStatusStream';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MAX_RATE_HISTORY = 60; // Keep last 60 data points (~1 minute at 1/sec)

interface RateDataPoint {
  timestamp: number;
  time: string;
  total: number;
  trades: number;
  orderbooks: number;
}

function formatLatency(us: number): string {
  if (us < 1000) return `${us}μs`;
  if (us < 1000000) return `${(us / 1000).toFixed(1)}ms`;
  return `${(us / 1000000).toFixed(2)}s`;
}

export default function ExecutionHealth() {
  const { connected, stats, trades, lastPrices, error } = useStatusStream();
  const [rateHistory, setRateHistory] = useState<RateDataPoint[]>([]);

  // Accumulate rate history on every stats update (capped by MAX_RATE_HISTORY)
  useEffect(() => {
    if (!stats?.message_rates) return;

    const now = Date.now();
    const newPoint: RateDataPoint = {
      timestamp: now,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      total: stats.message_rates.total || 0,
      trades: stats.message_rates.trades || 0,
      orderbooks: stats.message_rates.orderbooks || 0,
    };

    setRateHistory(prev => {
      const updated = [...prev, newPoint];
      // Keep only the last MAX_RATE_HISTORY points
      return updated.slice(-MAX_RATE_HISTORY);
    });
  }, [stats?.message_rates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution Health</h1>
          <p className="text-muted-foreground">Thread status, message rates, and recent trades</p>
        </div>
        <Badge variant={connected ? 'default' : 'destructive'} className="gap-1">
          {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages/sec</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.message_rates?.total?.toLocaleString() ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trades/sec</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.message_rates?.trades?.toLocaleString() ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orderbooks/sec</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.message_rates?.orderbooks?.toLocaleString() ?? '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Rate Chart */}
      {rateHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Message Rate History
            </CardTitle>
            <CardDescription>Messages per second over time (last {rateHistory.length} samples)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rateHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Total"
                  />
                  <Line
                    type="monotone"
                    dataKey="trades"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Trades"
                  />
                  <Line
                    type="monotone"
                    dataKey="orderbooks"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Orderbooks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thread Health Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Thread Health
          </CardTitle>
          <CardDescription>Status of processing threads</CardDescription>
        </CardHeader>
        <CardContent>
          {!stats?.thread_statuses ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : stats.thread_statuses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thread</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.thread_statuses.map((thread: any, idx: number) => (
                  <TableRow key={thread.name || idx}>
                    <TableCell className="font-medium">{thread.name || `Thread ${idx}`}</TableCell>
                    <TableCell>
                      <Badge variant={thread.state === 'running' ? 'default' : 'secondary'}>
                        {thread.state || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{thread.processed?.toLocaleString() ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {thread.errors > 0 ? (
                        <span className="text-destructive font-medium">{thread.errors}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {thread.avgLatencyUs !== undefined ? formatLatency(thread.avgLatencyUs) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No thread data available</p>
          )}
        </CardContent>
      </Card>

      {/* Last Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Last Prices
          </CardTitle>
          <CardDescription>Most recent prices by symbol</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(lastPrices).length === 0 ? (
            <p className="text-muted-foreground">No price data yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(lastPrices).slice(0, 12).map(([symbol, price]) => (
                <div key={symbol} className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground truncate">{symbol}</div>
                  <div className="font-mono font-medium">{typeof price === 'number' ? price.toFixed(2) : price}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Trades
          </CardTitle>
          <CardDescription>Last {Math.min(trades.length, 20)} trades received</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-muted-foreground">No trades yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.slice(-20).reverse().map((trade: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                        {trade.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{trade.price?.toFixed(2) ?? '—'}</TableCell>
                    <TableCell className="text-right">{trade.volume?.toFixed(4) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {trade.timestamp_iso || new Date(trade.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
