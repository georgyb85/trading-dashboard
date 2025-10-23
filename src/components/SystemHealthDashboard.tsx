import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { saveToCache, loadFromCache, CACHE_KEYS } from "@/utils/cache";
import {
  Wifi,
  WifiOff,
  Activity,
  Cpu,
  Zap
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface MessageRates {
  total_per_sec: number;
  trades_per_sec: number;
  orderbooks_per_sec: number;
}

interface GPUInfo {
  index: number;
  name: string;
  memory_mb: number;
}

interface SystemInfo {
  cpu_count: number;
  cpu_model: string;
  ram_total_mb: number;
  gpu_count: number;
  gpus: GPUInfo[];
  hostname: string;
  timestamp: number;
}

interface UsageMetrics {
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  gpu_percent?: number;
  gpu_mem_used_mb?: number;
  gpu_mem_total_mb?: number;
  message_rates?: MessageRates;
  timestamp: number;
}

interface UsageHistory {
  timestamp: number;
  cpu: number;
  ram: number;
  gpu?: number;
}

interface GPUInstance {
  id: string;
  ip: string;
  name: string;
  connected: boolean;
  systemInfo: SystemInfo | null;
  usageMetrics: UsageMetrics | null;
  usageHistory: UsageHistory[];
}

// Hardcoded GPU instances - add more as needed
const GPU_INSTANCES: Array<{id: string, ip: string, name: string}> = [
  { id: 'gpu1', ip: '39.114.73.97', name: 'GPU Server 1' },
  // Add more GPU instances here:
  // { id: 'gpu2', ip: '192.168.1.100', name: 'GPU Server 2' },
];

export function SystemHealthDashboard() {
  const wsRefs = useRef<Map<string, WebSocket>>(new Map());

  const [gpuInstances, setGpuInstances] = useState<GPUInstance[]>(() => {
    const cached = loadFromCache<GPUInstance[]>(CACHE_KEYS.SYSTEM_HEALTH);
    if (cached && cached.length > 0) {
      console.log('📂 Loaded GPU data from cache');
      return cached;
    }
    return GPU_INSTANCES.map(config => ({
      ...config,
      connected: false,
      systemInfo: null,
      usageMetrics: null,
      usageHistory: []
    }));
  });

  // Maximum number of data points to keep in history (e.g., last 20 updates = ~3.3 minutes at 10s intervals)
  const MAX_HISTORY_POINTS = 20;

  // WebSocket connections for GPU services
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Create WebSocket connection for each GPU instance
    gpuInstances.forEach((instance) => {
      const wsUrl = `${protocol}//${window.location.host}/gpu-ws`;

      console.log(`Connecting to GPU WebSocket for ${instance.name} (${instance.ip}):`, wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRefs.current.set(instance.id, ws);

      ws.onopen = () => {
        console.log(`GPU WebSocket connected: ${instance.name}`);
        ws.send('subscribe:usage');
        setGpuInstances(prev => prev.map(gpu =>
          gpu.id === instance.id
            ? { ...gpu, connected: true }
            : gpu
        ));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'system_info') {
          console.log(`Received system info for ${instance.name}:`, data);
          setGpuInstances(prev => prev.map(gpu =>
            gpu.id === instance.id
              ? { ...gpu, systemInfo: data }
              : gpu
          ));
        } else if (data.type === 'usage_update') {
          setGpuInstances(prev => {
            const updated = prev.map(gpu => {
              if (gpu.id === instance.id) {
                // Add new data point to history
                const newHistoryPoint: UsageHistory = {
                  timestamp: data.timestamp,
                  cpu: data.cpu_percent,
                  ram: data.ram_percent,
                  gpu: data.gpu_percent
                };

                // Keep only the last MAX_HISTORY_POINTS
                const updatedHistory = [...gpu.usageHistory, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

                return {
                  ...gpu,
                  usageMetrics: data,
                  usageHistory: updatedHistory
                };
              }
              return gpu;
            });

            // Save to cache
            saveToCache(CACHE_KEYS.SYSTEM_HEALTH, updated);
            return updated;
          });
        } else if (data.status === 'subscribed') {
          console.log(`Subscribed to usage updates for ${instance.name}`);
        }
      };

      ws.onerror = (error) => {
        console.error(`GPU WebSocket error for ${instance.name}:`, error);
        setGpuInstances(prev => prev.map(gpu =>
          gpu.id === instance.id
            ? { ...gpu, connected: false }
            : gpu
        ));
      };

      ws.onclose = () => {
        console.log(`GPU WebSocket disconnected: ${instance.name}`);
        setGpuInstances(prev => prev.map(gpu =>
          gpu.id === instance.id
            ? { ...gpu, connected: false }
            : gpu
        ));
      };
    });

    return () => {
      // Cleanup all WebSocket connections
      wsRefs.current.forEach(ws => ws.close());
      wsRefs.current.clear();
    };
  }, []);


  const getStatusIcon = (connected: boolean) => {
    return connected ? (
      <Wifi className="h-4 w-4 text-success" />
    ) : (
      <WifiOff className="h-4 w-4 text-loss" />
    );
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 50) return "text-success";
    if (percentage < 80) return "text-warning";
    return "text-loss";
  };

  // Get the first GPU instance for Kraken card
  const krakenInstance = gpuInstances[0];
  const krakenConnected = krakenInstance?.connected && krakenInstance?.usageMetrics?.message_rates !== undefined;
  const messageRates = krakenInstance?.usageMetrics?.message_rates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Health Dashboard</h1>
      </div>

      {/* Kraken Exchange Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kraken Exchange</CardTitle>
            {getStatusIcon(krakenConnected)}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={krakenConnected ? "default" : "destructive"} className="text-xs">
                  {krakenConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>

              {messageRates ? (
                <div className="space-y-3">
                  {/* Total Messages */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold font-mono text-primary">
                      {messageRates.total_per_sec}
                      <span className="text-sm text-muted-foreground ml-1">/s</span>
                    </span>
                  </div>

                  <div className="h-px bg-border"></div>

                  {/* Trades */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trades</span>
                    <span className="text-xl font-bold font-mono text-success">
                      {messageRates.trades_per_sec}
                      <span className="text-sm text-muted-foreground ml-1">/s</span>
                    </span>
                  </div>

                  {/* Orderbooks */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Orderbooks</span>
                    <span className="text-xl font-bold font-mono text-blue-500">
                      {messageRates.orderbooks_per_sec}
                      <span className="text-sm text-muted-foreground ml-1">/s</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <WifiOff className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Waiting for data...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPU Service Monitors */}
      {gpuInstances.map((instance) => {
        const { systemInfo, usageMetrics } = instance;

        return (
          <Card key={instance.id} className="trading-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{instance.name}</span>
                      {systemInfo && (
                        <span className="text-xs font-mono text-muted-foreground">
                          ({systemInfo.hostname})
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">{instance.ip}</div>
                  </div>
                </div>
                <Badge variant={instance.connected ? "default" : "destructive"}>
                  {instance.connected ? "Connected" : "Disconnected"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Information */}
              {systemInfo && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">CPU:</span>{' '}
                      <span className="font-mono text-xs">{systemInfo.cpu_model}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cores:</span>{' '}
                      <span className="font-semibold">{systemInfo.cpu_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total RAM:</span>{' '}
                      <span className="font-semibold">
                        {(systemInfo.ram_total_mb / 1024).toFixed(1)} GB
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GPUs:</span>{' '}
                      <span className="font-semibold">{systemInfo.gpu_count}</span>
                    </div>
                  </div>

                  {/* GPU Information */}
                  {systemInfo.gpus && systemInfo.gpus.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {systemInfo.gpus.map((gpu) => (
                        <div key={gpu.index} className="flex items-center justify-between p-2 rounded bg-background/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">GPU {gpu.index}</Badge>
                            <span className="text-sm font-medium">{gpu.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {(gpu.memory_mb / 1024).toFixed(1)} GB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Usage Metrics */}
              {usageMetrics && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Real-time Usage
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* CPU Usage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">CPU Usage</span>
                        <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.cpu_percent)}`}>
                          {usageMetrics.cpu_percent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={usageMetrics.cpu_percent} className="h-2" />
                      {/* Spacer to align with RAM/GPU which have memory info */}
                      <div className="h-4"></div>

                      {/* CPU Trend Chart */}
                      {instance.usageHistory.length > 1 && (
                        <div className="h-20 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={instance.usageHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                              <XAxis hide />
                              <YAxis
                                domain={[0, 100]}
                                hide
                              />
                              <Tooltip
                                contentStyle={{
                                  background: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px',
                                  fontSize: '12px'
                                }}
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'CPU']}
                                labelFormatter={(label) => `Point ${label + 1}`}
                              />
                              <Area
                                type="monotone"
                                dataKey="cpu"
                                stroke="hsl(var(--primary))"
                                fill="hsl(var(--primary) / 0.2)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* RAM Usage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">RAM Usage</span>
                        <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.ram_percent)}`}>
                          {usageMetrics.ram_percent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={usageMetrics.ram_percent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {(usageMetrics.ram_used_mb / 1024).toFixed(1)} / {(usageMetrics.ram_total_mb / 1024).toFixed(1)} GB
                      </p>

                      {/* RAM Trend Chart */}
                      {instance.usageHistory.length > 1 && (
                        <div className="h-20 mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={instance.usageHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                              <XAxis hide />
                              <YAxis
                                domain={[0, 100]}
                                hide
                              />
                              <Tooltip
                                contentStyle={{
                                  background: 'hsl(var(--background))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px',
                                  fontSize: '12px'
                                }}
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'RAM']}
                                labelFormatter={(label) => `Point ${label + 1}`}
                              />
                              <Area
                                type="monotone"
                                dataKey="ram"
                                stroke="#8b5cf6"
                                fill="rgb(139, 92, 246, 0.2)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* GPU Usage */}
                    {usageMetrics.gpu_percent !== undefined && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">GPU Usage</span>
                          <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.gpu_percent)}`}>
                            {usageMetrics.gpu_percent}%
                          </span>
                        </div>
                        <Progress value={usageMetrics.gpu_percent} className="h-2" />
                        {usageMetrics.gpu_mem_used_mb !== undefined && usageMetrics.gpu_mem_total_mb !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {(usageMetrics.gpu_mem_used_mb / 1024).toFixed(1)} / {(usageMetrics.gpu_mem_total_mb / 1024).toFixed(1)} GB
                          </p>
                        )}

                        {/* GPU Trend Chart */}
                        {instance.usageHistory.length > 1 && instance.usageHistory.some(h => h.gpu !== undefined) && (
                          <div className="h-20 mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={instance.usageHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                                <XAxis hide />
                                <YAxis
                                  domain={[0, 100]}
                                  hide
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                  }}
                                  formatter={(value: number) => [`${value}%`, 'GPU']}
                                  labelFormatter={(label) => `Point ${label + 1}`}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="gpu"
                                  stroke="#10b981"
                                  fill="rgb(16, 185, 129, 0.2)"
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last Update */}
                  <div className="text-xs text-muted-foreground text-right">
                    Last update: {new Date(usageMetrics.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {instance.connected && !usageMetrics && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
                  <p className="text-sm">Waiting for usage data...</p>
                </div>
              )}

              {/* Disconnected State */}
              {!instance.connected && (
                <div className="text-center py-8 text-muted-foreground">
                  <WifiOff className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Not connected</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* System Threads Status */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Thread Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Data Processor", status: "healthy" },
              { name: "ML Inference", status: "healthy" },
              { name: "Risk Monitor", status: "healthy" },
              { name: "Order Manager", status: "warning" }
            ].map((thread) => (
              <div key={thread.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{thread.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{thread.status}</p>
                </div>
                <span className={`status-indicator ${
                  thread.status === "healthy" ? "status-good" :
                  thread.status === "warning" ? "status-warning" : "status-error"
                }`}></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
