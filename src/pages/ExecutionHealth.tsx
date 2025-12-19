import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Activity, Cpu, Wifi, WifiOff, TrendingUp, Clock, BarChart2, AlertCircle, Gauge, Hash } from 'lucide-react';
import { useStatusStream } from '@/hooks/useStatusStream';
import { useStage1UsageStream } from '@/hooks/useStage1UsageStream';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine } from 'recharts';

const MAX_RATE_HISTORY = 60; // Keep last 60 data points (~1 minute at 1/sec)

interface RateDataPoint {
  timestamp: number;
  time: string;
  total: number;
  trades: number;
  orderbooks: number;
  errors: number;
}

function formatLatency(us: number): string {
  if (us < 1000) return `${us}μs`;
  if (us < 1000000) return `${(us / 1000).toFixed(1)}ms`;
  return `${(us / 1000000).toFixed(2)}s`;
}

export default function ExecutionHealth() {
  const { connected, stats, trades, lastPrices, error } = useStatusStream();
  const { usage: stage1Usage, connected: stage1Connected } = useStage1UsageStream();
  const [rateHistory, setRateHistory] = useState<RateDataPoint[]>([]);

  // Get message rates from status stream (Kraken trader)
  const messageRates = useMemo(() => {
    return {
      total: stats?.message_rates?.total || 0,
      trades: stats?.message_rates?.trades || 0,
      orderbooks: stats?.message_rates?.orderbooks || 0
    };
  }, [stats?.message_rates]);

  // Calculate total errors from thread statuses
  const totalErrors = useMemo(() => {
    if (!stats?.thread_statuses) return 0;
    return stats.thread_statuses.reduce((sum: number, t: any) => sum + (t.errors || 0), 0);
  }, [stats?.thread_statuses]);

  // Calculate total message counts
  const totalMessages = useMemo(() => {
    if (!stats?.message_counts) return { total: 0, trades: 0 };
    return {
      total: stats.message_counts.total || 0,
      trades: stats.message_counts.trade_messages || stats.message_counts.trades || 0
    };
  }, [stats?.message_counts]);

  // Calculate thread health summary
  const threadSummary = useMemo(() => {
    if (!stats?.thread_statuses) return { healthy: 0, warning: 0, error: 0, total: 0 };
    const threads = stats.thread_statuses as any[];
    return {
      healthy: threads.filter(t => t.state === 'running' && !t.errors).length,
      warning: threads.filter(t => t.state === 'running' && t.errors > 0).length,
      error: threads.filter(t => t.state !== 'running').length,
      total: threads.length
    };
  }, [stats?.thread_statuses]);

  // Accumulate rate history on every usage/stats update (capped by MAX_RATE_HISTORY)
  useEffect(() => {
    // Only add point if we have rate data from either source
    if (!messageRates.total && !messageRates.trades) return;

    const now = Date.now();
    const newPoint: RateDataPoint = {
      timestamp: now,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      total: messageRates.total,
      trades: messageRates.trades,
      orderbooks: messageRates.orderbooks,
      errors: totalErrors,
    };

    setRateHistory(prev => {
      const updated = [...prev, newPoint];
      // Keep only the last MAX_RATE_HISTORY points
      return updated.slice(-MAX_RATE_HISTORY);
    });
  }, [messageRates, totalErrors]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Execution Health</h1>
          <p className="text-muted-foreground">Thread status, message rates, and recent trades</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'default' : 'destructive'} className="gap-1">
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            Kraken
          </Badge>
          <Badge variant={stage1Connected ? 'default' : 'destructive'} className="gap-1">
            {stage1Connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            Stage1
          </Badge>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Row 1: Rates */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages/sec</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messageRates.total?.toLocaleString() ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {totalMessages.total.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trades/sec</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messageRates.trades?.toLocaleString() ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {totalMessages.trades.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orderbooks/sec</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {messageRates.orderbooks?.toLocaleString() ?? '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time updates
            </p>
          </CardContent>
        </Card>
        <Card className={totalErrors > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className={`h-4 w-4 ${totalErrors > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalErrors > 0 ? 'text-destructive' : ''}`}>
              {totalErrors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all threads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage1 Server Resources */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stage1 Server Resources</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stage1Usage ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium">{stage1Usage.cpu_percent.toFixed(1)}%</span>
                </div>
                <Progress value={stage1Usage.cpu_percent} className="h-1.5" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">RAM</span>
                  <span className="font-medium">{stage1Usage.ram_percent.toFixed(1)}%</span>
                </div>
                <Progress value={stage1Usage.ram_percent} className="h-1.5" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for data...</p>
          )}
        </CardContent>
      </Card>

      {/* Thread Health Overview */}
      {threadSummary.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="h-4 w-4" />
              Thread Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  {threadSummary.healthy > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(threadSummary.healthy / threadSummary.total) * 100}%` }}
                    />
                  )}
                  {threadSummary.warning > 0 && (
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(threadSummary.warning / threadSummary.total) * 100}%` }}
                    />
                  )}
                  {threadSummary.error > 0 && (
                    <div
                      className="bg-destructive transition-all"
                      style={{ width: `${(threadSummary.error / threadSummary.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{threadSummary.healthy} Healthy</span>
                </div>
                {threadSummary.warning > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>{threadSummary.warning} Warning</span>
                  </div>
                )}
                {threadSummary.error > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span>{threadSummary.error} Error</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rateHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(0, 84%, 60%)"
                    label={{ value: 'Errors', angle: 90, position: 'insideRight', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Total"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="trades"
                    stroke="hsl(142, 76%, 36%)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Trades"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orderbooks"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Orderbooks"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="errors"
                    stroke="hsl(0, 84%, 60%)"
                    strokeWidth={1.5}
                    dot={false}
                    name="Errors"
                    strokeDasharray="5 5"
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

      {/* Thread Latency Visualization */}
      {stats?.thread_statuses && stats.thread_statuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Thread Latency Distribution
            </CardTitle>
            <CardDescription>Average processing latency per thread</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.thread_statuses
                    .filter((t: any) => t.avgLatencyUs !== undefined && t.avgLatencyUs > 0)
                    .map((t: any) => ({
                      name: t.name?.replace(/_/g, ' ')?.slice(0, 15) || 'Unknown',
                      latencyMs: t.avgLatencyUs / 1000,
                      errors: t.errors || 0
                    }))}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v.toFixed(1)}ms`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={75}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'latencyMs') return [`${value.toFixed(2)}ms`, 'Latency'];
                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="latencyMs"
                    name="Latency"
                    radius={[0, 4, 4, 0]}
                  >
                    {stats.thread_statuses
                      .filter((t: any) => t.avgLatencyUs !== undefined && t.avgLatencyUs > 0)
                      .map((t: any, index: number) => {
                        const latencyMs = t.avgLatencyUs / 1000;
                        let fill = 'hsl(142, 76%, 36%)'; // Green
                        if (latencyMs > 100) fill = 'hsl(0, 84%, 60%)'; // Red
                        else if (latencyMs > 50) fill = 'hsl(38, 92%, 50%)'; // Orange
                        else if (latencyMs > 10) fill = 'hsl(48, 96%, 53%)'; // Yellow
                        return <Cell key={index} fill={fill} />;
                      })}
                  </Bar>
                  <ReferenceLine x={10} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" label={{ value: '10ms', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <ReferenceLine x={50} stroke="hsl(48, 96%, 53%)" strokeDasharray="3 3" label={{ value: '50ms', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-500" /> &lt;10ms</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-yellow-500" /> 10-50ms</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-500" /> 50-100ms</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500" /> &gt;100ms</span>
            </div>
          </CardContent>
        </Card>
      )}

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
