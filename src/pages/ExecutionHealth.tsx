import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Cpu, Wifi, WifiOff, TrendingUp, Clock, BarChart2, AlertCircle, Gauge } from 'lucide-react';
import { useStatusStreamContext } from '@/contexts/StatusStreamContext';
import { useUsageStreamContext } from '@/contexts/UsageStreamContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, ReferenceLine, AreaChart, Area } from 'recharts';

const MAX_RATE_HISTORY = 60; // Keep last 60 data points (~1 minute at 1/sec)
const MAX_USAGE_HISTORY = 60; // Keep last 60 data points for resource usage

interface RateDataPoint {
  timestamp: number;
  time: string;
  total: number;
  trades: number;
  orderbooks: number;
  errors: number;
}

interface UsageDataPoint {
  timestamp: number;
  time: string;
  cpu: number;
  ram: number;
  gpu?: number | null;
}

function formatLatency(us: number): string {
  if (us < 1000) return `${us}μs`;
  if (us < 1000000) return `${(us / 1000).toFixed(1)}ms`;
  return `${(us / 1000000).toFixed(2)}s`;
}

function readRate(rates: Record<string, number> | undefined, keys: string[]): number {
  if (!rates) return 0;
  for (const key of keys) {
    const value = rates[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

export default function ExecutionHealth() {
  const { connected, stats, trades, lastPrices, error } = useStatusStreamContext();
  const { usage: krakenUsage, systemInfo: krakenSystemInfo, connected: krakenUsageConnected, error: krakenUsageError } = useUsageStreamContext();
  const [rateHistory, setRateHistory] = useState<RateDataPoint[]>([]);
  const [krakenUsageHistory, setKrakenUsageHistory] = useState<UsageDataPoint[]>([]);

  // Get message rates from status or usage stream (Kraken trader)
  const messageRates = useMemo(() => {
    const rates = (stats?.message_rates ?? krakenUsage?.message_rates) as Record<string, number> | undefined;
    return {
      total: readRate(rates, ['total', 'total_per_sec', 'totalPerSec']),
      trades: readRate(rates, ['trades', 'trades_per_sec', 'tradesPerSec', 'trade_messages', 'tradeMessages']),
      orderbooks: readRate(rates, ['orderbooks', 'orderbooks_per_sec', 'orderbooksPerSec', 'orderbook_messages', 'orderbookMessages'])
    };
  }, [stats?.message_rates, krakenUsage?.message_rates]);

  // Calculate total errors from thread statuses
  const totalErrors = useMemo(() => {
    if (!stats?.thread_statuses) return 0;
    return stats.thread_statuses.reduce((sum: number, t: any) => sum + (t.errors || 0), 0);
  }, [stats?.thread_statuses]);

  // Calculate total message counts
  const totalMessages = useMemo(() => {
    if (!stats?.message_counts) return { total: 0, trades: 0, orderbooks: 0 };
    const trades = stats.message_counts.trade_messages ?? stats.message_counts.tradeMessages ?? stats.message_counts.trades ?? 0;
    const orderbooks = stats.message_counts.orderbook_messages ?? stats.message_counts.orderbookMessages ?? stats.message_counts.orderbooks ?? 0;
    return {
      total: stats.message_counts.total ?? trades + orderbooks,
      trades,
      orderbooks
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

  const hasGpuHistory = krakenUsageHistory.some(point => typeof point.gpu === 'number');

  // Accumulate rate history on every usage/stats update (capped by MAX_RATE_HISTORY)
  useEffect(() => {
    const rateSource = (stats?.message_rates ?? krakenUsage?.message_rates) as Record<string, number> | undefined;
    if (!rateSource) return;

    const now = stats?.message_rates && stats.timestamp
      ? new Date(stats.timestamp).getTime()
      : krakenUsage?.timestamp
        ? krakenUsage.timestamp * 1000
        : Date.now();
    const newPoint: RateDataPoint = {
      timestamp: now,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      total: messageRates.total,
      trades: messageRates.trades,
      orderbooks: messageRates.orderbooks,
      errors: totalErrors,
    };

    setRateHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].timestamp === newPoint.timestamp) {
        const updated = [...prev];
        updated[updated.length - 1] = newPoint;
        return updated;
      }
      const updated = [...prev, newPoint];
      // Keep only the last MAX_RATE_HISTORY points
      return updated.slice(-MAX_RATE_HISTORY);
    });
  }, [messageRates.total, messageRates.trades, messageRates.orderbooks, totalErrors, stats?.timestamp, krakenUsage?.timestamp]);

  // Accumulate Kraken usage history over time
  useEffect(() => {
    if (!krakenUsage) return;

    const now = krakenUsage.timestamp ? krakenUsage.timestamp * 1000 : Date.now();
    const newPoint: UsageDataPoint = {
      timestamp: now,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: krakenUsage.cpu_percent,
      ram: krakenUsage.ram_percent,
      gpu: typeof krakenUsage.gpu_percent === 'number' ? krakenUsage.gpu_percent : null,
    };

    setKrakenUsageHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].timestamp === newPoint.timestamp) {
        const updated = [...prev];
        updated[updated.length - 1] = newPoint;
        return updated;
      }
      const updated = [...prev, newPoint];
      return updated.slice(-MAX_USAGE_HISTORY);
    });
  }, [krakenUsage]);

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
            Status
          </Badge>
          <Badge variant={krakenUsageConnected ? 'default' : 'destructive'} className="gap-1">
            {krakenUsageConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            Usage
          </Badge>
        </div>
      </div>

      {(error || krakenUsageError) && (
        <Card className="border-destructive">
          <CardContent className="pt-6 space-y-2">
            {error && (
              <p className="text-destructive">Status stream: {error}</p>
            )}
            {krakenUsageError && (
              <p className="text-destructive">Usage stream: {krakenUsageError}</p>
            )}
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
              Total: {totalMessages.orderbooks.toLocaleString()}
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

      <div className="grid gap-4 lg:grid-cols-2">
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
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
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
                      labelFormatter={(value) => new Date(value as number).toLocaleTimeString()}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Total"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="trades"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={1.5}
                      dot={false}
                      name="Trades"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="orderbooks"
                      stroke="hsl(217, 91%, 60%)"
                      strokeWidth={1.5}
                      dot={false}
                      name="Orderbooks"
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="right"
                      type="linear"
                      dataKey="errors"
                      stroke="hsl(0, 84%, 60%)"
                      strokeWidth={1.5}
                      dot={false}
                      name="Errors"
                      strokeDasharray="5 5"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {krakenUsageHistory.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5" />
                Kraken Resource History
              </CardTitle>
              <CardDescription>
                CPU, RAM{hasGpuHistory ? ', GPU' : ''} utilization over time (last {krakenUsageHistory.length} samples)
                {krakenSystemInfo?.hostname ? `, ${krakenSystemInfo.hostname}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={krakenUsageHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="timestamp"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                      labelFormatter={(value) => new Date(value as number).toLocaleTimeString()}
                      formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    />
                    <Legend />
                    <Area
                      type="linear"
                      dataKey="cpu"
                      stroke="hsl(217, 91%, 60%)"
                      fill="hsl(217, 91%, 60%)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="CPU"
                      isAnimationActive={false}
                    />
                    <Area
                      type="linear"
                      dataKey="ram"
                      stroke="hsl(142, 76%, 36%)"
                      fill="hsl(142, 76%, 36%)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="RAM"
                      isAnimationActive={false}
                    />
                    {hasGpuHistory && (
                      <Area
                        type="linear"
                        dataKey="gpu"
                        stroke="hsl(38, 92%, 50%)"
                        fill="hsl(38, 92%, 50%)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        name="GPU"
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
