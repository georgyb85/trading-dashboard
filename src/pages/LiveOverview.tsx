import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Server, Clock, Database, HardDrive, Wifi, WifiOff, AlertTriangle, PauseCircle, Wallet, TrendingUp, ShoppingCart } from 'lucide-react';
import { useHealthData } from '@/hooks/useHealthData';
import { useLiveModels, useDeactivateModel } from '@/hooks/useKrakenLive';
import { useStatusStreamContext } from '@/contexts/StatusStreamContext';
import { useUsageStreamContext } from '@/contexts/UsageStreamContext';
import { useStage1UsageStreamContext } from '@/contexts/Stage1UsageStreamContext';
import { useAccountStateContext } from '@/contexts/AccountStateContext';

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

function formatMemory(usedMb?: number, totalMb?: number): string {
  if (usedMb === undefined || totalMb === undefined) return '—';
  return `${(usedMb / 1024).toFixed(1)} / ${(totalMb / 1024).toFixed(1)} GB`;
}

export default function LiveOverview() {
  const { data: health, isLoading: healthLoading, error: healthError } = useHealthData();
  const { connected: krakenConnected, error: krakenError } = useStatusStreamContext();
  const { usage: krakenUsage, systemInfo: krakenSystemInfo, connected: krakenUsageConnected, error: krakenUsageError } = useUsageStreamContext();
  const { usage: stage1Usage, systemInfo: stage1SystemInfo, connected: stage1Connected, error: stage1Error } = useStage1UsageStreamContext();
  const { data: models } = useLiveModels();
  const deactivateMutation = useDeactivateModel();
  const { balances, positions, orders, connected: accountConnected } = useAccountStateContext();

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : healthError ? (
              <div className="text-destructive text-2xl font-bold">Error</div>
            ) : (
              <div className="text-2xl font-bold">{activeModelsCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {health?.models.length ?? 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Executors</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tradingModelsCount}</div>
            <p className="text-xs text-muted-foreground">Active with executors</p>
          </CardContent>
        </Card>
      </div>

      {/* Server Resources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={krakenConnected || krakenUsageConnected ? 'border-green-500/30' : 'border-destructive/30'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Kraken Trader
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={krakenConnected ? 'default' : 'destructive'} className="gap-1">
                {krakenConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                Status
              </Badge>
              <Badge variant={krakenUsageConnected ? 'default' : 'destructive'} className="gap-1">
                {krakenUsageConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                Usage
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {krakenUsage ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-medium">{krakenUsage.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={krakenUsage.cpu_percent} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RAM</span>
                    <span className="font-medium">{krakenUsage.ram_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={krakenUsage.ram_percent} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Memory</span>
                    <span className="font-mono">{formatMemory(krakenUsage.ram_used_mb, krakenUsage.ram_total_mb)}</span>
                  </div>
                </div>
                {krakenUsage.gpu_percent !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GPU</span>
                      <span className="font-medium">{krakenUsage.gpu_percent.toFixed(1)}%</span>
                    </div>
                    <Progress value={krakenUsage.gpu_percent} className="h-1.5" />
                    {(krakenUsage.gpu_mem_used_mb !== undefined && krakenUsage.gpu_mem_total_mb !== undefined) && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>GPU Memory</span>
                        <span className="font-mono">{formatMemory(krakenUsage.gpu_mem_used_mb, krakenUsage.gpu_mem_total_mb)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : krakenUsageError ? (
              <p className="text-sm text-destructive truncate" title={krakenUsageError}>{krakenUsageError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for usage telemetry...</p>
            )}

            {krakenSystemInfo && (
              <div className="pt-3 border-t text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-mono">{krakenSystemInfo.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium truncate ml-4" title={krakenSystemInfo.cpu_model}>
                    {krakenSystemInfo.cpu_model?.split('@')[0]?.trim() || krakenSystemInfo.cpu_model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RAM</span>
                  <span className="font-medium">{(krakenSystemInfo.ram_total_mb / 1024).toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GPU</span>
                  <span className="font-medium">
                    {krakenSystemInfo.gpu_count > 0
                      ? `${krakenSystemInfo.gpu_count}x ${krakenSystemInfo.gpus[0]?.name || 'GPU'}`
                      : 'None'}
                  </span>
                </div>
              </div>
            )}

            {krakenError && (
              <p className="text-xs text-destructive truncate" title={krakenError}>{krakenError}</p>
            )}
          </CardContent>
        </Card>

        <Card className={stage1Connected ? 'border-green-500/30' : 'border-destructive/30'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Stage1 Server
            </CardTitle>
            <Badge variant={stage1Connected ? 'default' : 'destructive'} className="gap-1">
              {stage1Connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              Usage
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {stage1Usage ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-medium">{stage1Usage.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={stage1Usage.cpu_percent} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">RAM</span>
                    <span className="font-medium">{stage1Usage.ram_percent.toFixed(1)}%</span>
                  </div>
                  <Progress value={stage1Usage.ram_percent} className="h-1.5" />
                </div>
              </div>
            ) : stage1Error ? (
              <p className="text-sm text-destructive truncate" title={stage1Error}>{stage1Error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for usage telemetry...</p>
            )}

            {stage1SystemInfo && (
              <div className="pt-3 border-t text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-mono">{stage1SystemInfo.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="font-medium truncate ml-4" title={stage1SystemInfo.cpu_model}>
                    {stage1SystemInfo.cpu_model?.split('@')[0]?.trim() || stage1SystemInfo.cpu_model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RAM</span>
                  <span className="font-medium">{(stage1SystemInfo.ram_total_mb / 1024).toFixed(1)} GB</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
