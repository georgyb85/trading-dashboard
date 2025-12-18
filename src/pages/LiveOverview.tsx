import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Server, Clock, Database, Cpu, HardDrive, Wifi, WifiOff, AlertTriangle, PauseCircle, Wallet, TrendingUp, ShoppingCart, MonitorSmartphone, BarChart3 } from 'lucide-react';
import { useHealthData } from '@/hooks/useHealthData';
import { useUsageStream } from '@/hooks/useUsageStream';
import { useLiveModels, useDeactivateModel } from '@/hooks/useKrakenLive';
import { useAccountState } from '@/hooks/useAccountState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const MAX_USAGE_HISTORY = 60; // Keep last 60 data points

interface UsageDataPoint {
  timestamp: number;
  time: string;
  cpu: number;
  ram: number;
  gpu?: number;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never';
  const date = new Date(ts);
  return date.toLocaleTimeString();
}

export default function LiveOverview() {
  const { data: health, isLoading: healthLoading, error: healthError } = useHealthData();
  const { usage, systemInfo, connected: usageConnected, error: usageError } = useUsageStream();
  const { data: models } = useLiveModels();
  const deactivateMutation = useDeactivateModel();
  const { balances, positions, orders, connected: accountConnected } = useAccountState();
  const [usageHistory, setUsageHistory] = useState<UsageDataPoint[]>([]);

  // Accumulate usage history over time
  useEffect(() => {
    if (!usage) return;

    const now = Date.now();
    const newPoint: UsageDataPoint = {
      timestamp: now,
      time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: usage.cpu_percent,
      ram: usage.ram_percent,
      gpu: usage.gpu_percent,
    };

    setUsageHistory(prev => {
      const updated = [...prev, newPoint];
      return updated.slice(-MAX_USAGE_HISTORY);
    });
  }, [usage]);

  // Filter to models with executors (trading-enabled models)
  const tradingModels = models?.filter(m => m.status === 'active' && m.has_executor) ?? [];
  const tradingModelsCount = tradingModels.length;

  const handleDeactivateAll = async () => {
    if (tradingModels.length === 0) return;
    if (!confirm(`Are you sure you want to deactivate ${tradingModels.length} trading model(s)?`)) return;

    const errors: string[] = [];
    let successCount = 0;
    for (const model of tradingModels) {
      try {
        await deactivateMutation.mutateAsync(model.model_id);
        successCount++;
      } catch (e) {
        errors.push(`${model.model_id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    if (errors.length > 0) {
      toast({
        title: 'Partial deactivation failure',
        description: `${successCount} succeeded, ${errors.length} failed: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`,
        variant: 'destructive',
      });
    } else if (successCount > 0) {
      toast({
        title: 'Models deactivated',
        description: `Successfully deactivated ${successCount} model(s)`,
      });
    }
  };

  const activeModelsCount = models?.filter(m => m.status === 'active').length ?? 0;
  const staleStreams = health?.streams.filter(s => s.stale).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Overview</h1>
          <p className="text-muted-foreground">System health at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {tradingModelsCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivateAll}
              disabled={deactivateMutation.isPending}
              title={`Deactivate ${tradingModelsCount} trading model(s) with executors`}
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Deactivate All ({tradingModelsCount})
            </Button>
          )}
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : healthError ? (
              <div className="text-destructive text-2xl font-bold">Error</div>
            ) : (
              <div className="text-2xl font-bold">{formatUptime(health?.uptime_ms ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Pipeline: {health?.pipeline ?? 'Unknown'}
            </p>
          </CardContent>
        </Card>

        {/* Streams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streams</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{health?.streams.length ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {staleStreams > 0 ? (
                <span className="text-destructive">{staleStreams} stale</span>
              ) : (
                'All healthy'
              )}
            </p>
          </CardContent>
        </Card>

        {/* Models */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Models</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{health?.models.length ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {activeModelsCount > 0 ? `${activeModelsCount} active` : 'None active'}
            </p>
          </CardContent>
        </Card>

        {/* Connection */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage WS</CardTitle>
            {usageConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageConnected ? 'Connected' : 'Disconnected'}
            </div>
            {usageError ? (
              <p className="text-xs text-destructive truncate" title={usageError}>
                {usageError}
              </p>
            ) : systemInfo ? (
              <p className="text-xs text-muted-foreground truncate">
                {systemInfo.hostname}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Resource Gauges and Queue Depths */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Resource Gauges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Resources
            </CardTitle>
            <CardDescription>Real-time resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!usage ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span className="font-medium">{usage.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={usage.cpu_percent} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>RAM ({usage.ram_used_mb} / {usage.ram_total_mb} MB)</span>
                    <span className="font-medium">{usage.ram_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={usage.ram_percent} className="h-2" />
                </div>
                {usage.gpu_percent !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>GPU {usage.gpu_mem_used_mb !== undefined && `(${usage.gpu_mem_used_mb} / ${usage.gpu_mem_total_mb} MB)`}</span>
                      <span className="font-medium">{usage.gpu_percent}%</span>
                    </div>
                    <Progress value={usage.gpu_percent} className="h-2" />
                  </div>
                )}
                {usage.message_rates && (
                  <div className="pt-2 border-t space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages/sec</span>
                      <span>{usage.message_rates.total_per_sec.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trades/sec</span>
                      <span>{usage.message_rates.trades_per_sec.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Orderbooks/sec</span>
                      <span>{usage.message_rates.orderbooks_per_sec.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Queue Depths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Queue Depths
            </CardTitle>
            <CardDescription>Pipeline queue utilization</CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : health?.queues ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(health.queues).map(([name, q]) => {
                    const pct = q.capacity > 0 ? (q.pending / q.capacity) * 100 : 0;
                    return (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-right">{q.pending}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{q.capacity}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pct > 80 ? 'destructive' : pct > 50 ? 'secondary' : 'outline'}>
                            {pct.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No queue data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage History Chart */}
      {usageHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resource Usage History
            </CardTitle>
            <CardDescription>
              CPU, RAM{usageHistory.some(p => p.gpu !== undefined) ? ', and GPU' : ''} utilization over time (last {usageHistory.length} samples)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
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
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="hsl(217, 91%, 60%)"
                    fill="hsl(217, 91%, 60%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="CPU"
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    stroke="hsl(142, 76%, 36%)"
                    fill="hsl(142, 76%, 36%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="RAM"
                  />
                  {usageHistory.some(p => p.gpu !== undefined) && (
                    <Area
                      type="monotone"
                      dataKey="gpu"
                      stroke="hsl(38, 92%, 50%)"
                      fill="hsl(38, 92%, 50%)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="GPU"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Summary and System Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Account Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Account Summary
              </CardTitle>
              <CardDescription>Trading account overview</CardDescription>
            </div>
            <Badge variant={accountConnected ? 'default' : 'destructive'} className="gap-1">
              {accountConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {accountConnected ? 'Live' : 'Offline'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p className="text-lg font-semibold">
                  {balances.length > 0 ? (
                    <>
                      ${balances.reduce((sum, b) => {
                        const total = parseFloat(b.total || '0');
                        return sum + (isNaN(total) ? 0 : total);
                      }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Positions
                </p>
                <p className="text-lg font-semibold">
                  {positions.length > 0 ? (
                    <span className={positions.some(p => parseFloat(p.unrealizedPnl || '0') > 0) ? 'text-green-500' : positions.some(p => parseFloat(p.unrealizedPnl || '0') < 0) ? 'text-red-500' : ''}>
                      {positions.length}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Active Orders
                </p>
                <p className="text-lg font-semibold">
                  {orders.length > 0 ? (
                    <span className="text-blue-500">{orders.length}</span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </p>
              </div>
            </div>
            {positions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Open Positions</p>
                <div className="space-y-2">
                  {positions.slice(0, 3).map((pos) => {
                    const pnl = parseFloat(pos.unrealizedPnl || '0');
                    const pnlPct = parseFloat(pos.unrealizedPnlPct || '0');
                    return (
                      <div key={pos.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={pos.side === 'long' ? 'default' : 'destructive'} className="text-xs">
                            {pos.side?.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{pos.symbol}</span>
                        </div>
                        <span className={pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    );
                  })}
                  {positions.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{positions.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              System Info
            </CardTitle>
            <CardDescription>Server hardware specifications</CardDescription>
          </CardHeader>
          <CardContent>
            {!systemInfo ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hostname</span>
                  <span className="font-medium">{systemInfo.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium truncate ml-4" title={systemInfo.cpu_model}>
                    {systemInfo.cpu_model?.split('@')[0]?.trim() || systemInfo.cpu_model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Cores</span>
                  <span className="font-medium">{systemInfo.cpu_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total RAM</span>
                  <span className="font-medium">{(systemInfo.ram_total_mb / 1024).toFixed(1)} GB</span>
                </div>
                {systemInfo.gpu_count > 0 && (
                  <>
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-xs">GPUs ({systemInfo.gpu_count})</span>
                    </div>
                    {systemInfo.gpus?.map((gpu, idx) => (
                      <div key={idx} className="flex justify-between pl-2">
                        <span className="text-muted-foreground truncate" title={gpu.name}>
                          {gpu.name?.split(' ').slice(0, 3).join(' ')}
                        </span>
                        <span className="font-medium">{(gpu.memory_mb / 1024).toFixed(0)} GB</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stream Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Stream Status
          </CardTitle>
          <CardDescription>Active data streams and their health</CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : health?.streams && health.streams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stream ID</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>OHLCV Buffer</TableHead>
                  <TableHead>Last Bar</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.streams.map((stream) => (
                  <TableRow key={stream.stream_id}>
                    <TableCell className="font-medium">{stream.stream_id}</TableCell>
                    <TableCell>{stream.feature_count}</TableCell>
                    <TableCell>{stream.ohlcv_buffer_size}</TableCell>
                    <TableCell>{formatTimestamp(stream.last_bar_ts)}</TableCell>
                    <TableCell>
                      {stream.stale ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Stale
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600">
                          Healthy
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No streams configured</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
