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

// New extended API types
interface PriceUpdate {
  symbol: string;
  price: number;
}

interface ThreadStatus {
  name: string;
  state: "running" | "starting" | "stopped" | "error";
  processed: number;
  errors: number;
  avgLatencyUs: number;
}

interface RingBufferStats {
  unconsumed: number;
  utilization: number;
  max12h: number;
}

interface StatusUpdate {
  topic: "status";
  type: "update";
  stats: {
    timestamp: string;
    lastPrices: PriceUpdate[];
    counts: {
      tradeMessages: number;
      orderbookMessages: number;
    };
    rates: {
      totalPerSec: number;
      tradesPerSec: number;
      orderbooksPerSec: number;
    };
    threads: ThreadStatus[];
    ringBuffers: Record<string, RingBufferStats>;
  };
  trades: any[];
  ohlcv: any[];
}

interface UsageUpdateNew {
  type: "usage_update";
  cpu: number;
  ram: number;
  gpu: number;
  messagesPerSec: number;
  tradesPerSec: number;
  orderbooksPerSec: number;
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
  { id: 'gpu1', ip: '220.82.46.3', name: 'GPU Server 1' },
  // Add more GPU instances here:
  // { id: 'gpu2', ip: '192.168.1.100', name: 'GPU Server 2' },
];

// Database server instances
const DB_INSTANCES: Array<{id: string, host: string, name: string}> = [
  { id: 'db1', host: 'agenticresearch.info', name: 'DB Server 1' },
];

type GPUInstanceConfig = (typeof GPU_INSTANCES)[number];
type DBInstanceConfig = (typeof DB_INSTANCES)[number];

interface DBInstance {
  id: string;
  host: string;
  name: string;
  connected: boolean;
  systemInfo: SystemInfo | null;
  usageMetrics: UsageMetrics | null;
  usageHistory: UsageHistory[];
}

export function SystemHealthDashboard() {
  const wsRefs = useRef<Map<string, WebSocket>>(new Map());
  const reconnectTimers = useRef<Map<string, number>>(new Map());
  const retryCounts = useRef<Map<string, number>>(new Map());
  const systemStatusWsRef = useRef<WebSocket | null>(null);
  const systemUsageWsRef = useRef<WebSocket | null>(null);

  // New state for extended API data
  const [lastPrices, setLastPrices] = useState<PriceUpdate[]>([]);
  const [threads, setThreads] = useState<ThreadStatus[]>([]);
  const [ringBuffers, setRingBuffers] = useState<Record<string, RingBufferStats>>({});
  const [messageRatesExtended, setMessageRatesExtended] = useState<{
    totalPerSec: number;
    tradesPerSec: number;
    orderbooksPerSec: number;
  } | null>(null);
  const [systemUsage, setSystemUsage] = useState<{
    cpu: number;
    ram: number;
    gpu: number;
  } | null>(null);

  const [gpuInstances, setGpuInstances] = useState<GPUInstance[]>(() => {
    const cached = loadFromCache<GPUInstance[]>(CACHE_KEYS.SYSTEM_HEALTH);
    if (cached && cached.length > 0) {
      console.log("📂 Loaded GPU data from cache");
      const cachedMap = new Map(cached.map(instance => [instance.id, instance]));
      return GPU_INSTANCES.map(config => {
        const cachedInstance = cachedMap.get(config.id);
        if (cachedInstance) {
          return {
            ...cachedInstance,
            ...config,
            connected: false,
            systemInfo: cachedInstance.systemInfo ?? null,
            usageMetrics: cachedInstance.usageMetrics ?? null,
            usageHistory: cachedInstance.usageHistory ?? []
          };
        }
        return {
          ...config,
          connected: false,
          systemInfo: null,
          usageMetrics: null,
          usageHistory: []
        };
      });
    }
    return GPU_INSTANCES.map(config => ({
      ...config,
      connected: false,
      systemInfo: null,
      usageMetrics: null,
      usageHistory: []
    }));
  });

  const [dbInstances, setDbInstances] = useState<DBInstance[]>(() => {
    return DB_INSTANCES.map(config => ({
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
    // GPU WebSocket services are currently unavailable
    console.warn('[SystemHealth] GPU WebSocket services disabled - GPU server not responding');
    return () => {};

    /* Disabled until GPU server is online
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const BASE_RECONNECT_DELAY_MS = 2000;
    const MAX_RECONNECT_DELAY_MS = 60000;
    const reconnectMap = reconnectTimers.current;
    const wsMap = wsRefs.current;
    const retryMap = retryCounts.current;

    function scheduleReconnect(config: GPUInstanceConfig) {
      if (reconnectMap.has(config.id)) {
        return;
      }

      const attempt = retryMap.get(config.id) ?? 0;
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt),
        MAX_RECONNECT_DELAY_MS
      );
      const nextAttempt = attempt + 1;
      retryMap.set(config.id, nextAttempt);
      console.info(
        `GPU WebSocket reconnect scheduled for ${config.name} in ${delay}ms (attempt ${nextAttempt})`
      );

      const timerId = window.setTimeout(() => {
        reconnectMap.delete(config.id);
        connect(config);
      }, delay);

      reconnectMap.set(config.id, timerId);
    }

    function connect(config: GPUInstanceConfig) {
      const wsUrl = `${protocol}//${window.location.host}/gpu-ws`;

      console.log(`Connecting to GPU WebSocket for ${config.name} (${config.ip}):`, wsUrl);

      const existing = wsMap.get(config.id);
      if (existing) {
        try {
          existing.close();
        } catch (error) {
          console.warn(`Error closing existing WebSocket for ${config.name}:`, error);
        }
      }

      wsMap.delete(config.id);

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error(`Failed to create GPU WebSocket for ${config.name}:`, error);
        scheduleReconnect(config);
        return;
      }

      wsMap.set(config.id, ws);

      ws.onopen = () => {
        console.log(`GPU WebSocket connected: ${config.name}`);
        const existingTimer = reconnectMap.get(config.id);
        if (existingTimer) {
          window.clearTimeout(existingTimer);
          reconnectMap.delete(config.id);
        }
        retryMap.set(config.id, 0);
        ws.send("subscribe:usage");
        setGpuInstances(prev =>
          prev.map(gpu =>
            gpu.id === config.id
              ? { ...gpu, connected: true }
              : gpu
          )
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "system_info") {
          console.log(`Received system info for ${config.name}:`, data);
          setGpuInstances(prev => prev.map(gpu =>
            gpu.id === config.id
              ? { ...gpu, systemInfo: data }
              : gpu
          ));
        } else if (data.type === "usage_update") {
          setGpuInstances(prev => {
            const updated = prev.map(gpu => {
              if (gpu.id === config.id) {
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
        } else if (data.status === "subscribed") {
          console.log(`Subscribed to usage updates for ${config.name}`);
        }
      };

      ws.onerror = (event) => {
        console.error(`GPU WebSocket error for ${config.name}:`, event);
        setGpuInstances(prev => prev.map(gpu =>
          gpu.id === config.id
            ? { ...gpu, connected: false }
            : gpu
        ));
        scheduleReconnect(config);
      };

      ws.onclose = (event) => {
        console.log(`GPU WebSocket disconnected: ${config.name}`, event);
        setGpuInstances(prev => prev.map(gpu =>
          gpu.id === config.id
            ? { ...gpu, connected: false }
            : gpu
        ));
        wsMap.delete(config.id);
        scheduleReconnect(config);
      };
    }

    GPU_INSTANCES.forEach(config => connect(config));

    return () => {
      reconnectMap.forEach(timerId => window.clearTimeout(timerId));
      reconnectMap.clear();
      wsMap.forEach(ws => ws.close());
      wsMap.clear();
      retryMap.clear();
    };
    */
  }, []);

  // WebSocket connections for DB services
  useEffect(() => {
    // DB WebSocket service is currently unavailable
    console.warn('[SystemHealth] DB WebSocket service disabled - /usage endpoint not available');
    return () => {};

    /* Disabled until /usage endpoint is implemented
    const dbWsRefs = new Map<string, WebSocket>();

    function connectDB(config: DBInstanceConfig) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${config.host}/usage`;

      console.log(`[DB] Connecting to ${config.name}:`, wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        dbWsRefs.set(config.id, ws);

        ws.onopen = () => {
          console.log(`[DB] WebSocket connected: ${config.name}`);
          setDbInstances(prev =>
            prev.map(db =>
              db.id === config.id
                ? { ...db, connected: true }
                : db
            )
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "system_info") {
              console.log(`[DB] Received system info for ${config.name}:`, data);
              setDbInstances(prev => prev.map(db =>
                db.id === config.id
                  ? { ...db, systemInfo: data }
                  : db
              ));
            } else if (data.type === "usage_update") {
              setDbInstances(prev => {
                return prev.map(db => {
                  if (db.id === config.id) {
                    const newHistoryPoint: UsageHistory = {
                      timestamp: data.timestamp,
                      cpu: data.cpu_percent,
                      ram: data.ram_percent,
                    };

                    const updatedHistory = [...db.usageHistory, newHistoryPoint].slice(-MAX_HISTORY_POINTS);

                    return {
                      ...db,
                      usageMetrics: data,
                      usageHistory: updatedHistory
                    };
                  }
                  return db;
                });
              });
            }
          } catch (error) {
            console.error(`[DB] Error parsing message for ${config.name}:`, error);
          }
        };

        ws.onerror = (error) => {
          console.error(`[DB] WebSocket error for ${config.name}:`, error);
          setDbInstances(prev => prev.map(db =>
            db.id === config.id
              ? { ...db, connected: false }
              : db
          ));
        };

        ws.onclose = () => {
          console.log(`[DB] WebSocket disconnected: ${config.name}, reconnecting in 5s...`);
          setDbInstances(prev => prev.map(db =>
            db.id === config.id
              ? { ...db, connected: false }
              : db
          ));
          setTimeout(() => connectDB(config), 5000);
        };
      } catch (error) {
        console.error(`[DB] Failed to create WebSocket for ${config.name}:`, error);
        setTimeout(() => connectDB(config), 5000);
      }
    }

    DB_INSTANCES.forEach(config => connectDB(config));

    return () => {
      dbWsRefs.forEach(ws => ws.close());
      dbWsRefs.clear();
    };
    */
  }, []);

  // System Health WebSocket connections (new extended API)
  useEffect(() => {
    // GPU system status/usage WebSocket services are currently unavailable
    console.warn('[SystemHealth] System status/usage WebSockets disabled - GPU server not responding');
    return () => {};

    /* Disabled until GPU server system services are available
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Connect to /status endpoint for prices, threads, ring buffers
    function connectSystemStatus() {
      const wsUrl = `${protocol}//${window.location.host}/system-status`;
      console.log('[SystemHealth] Connecting to status WebSocket:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        systemStatusWsRef.current = ws;

        ws.onopen = () => {
          console.log('[SystemHealth] Status WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data: StatusUpdate = JSON.parse(event.data);

            if (data.type === 'update' && data.stats) {
              // Log the actual stats structure once to debug
              if (!data.stats.ringBuffers) {
                console.log('[SystemHealth] Stats object keys:', Object.keys(data.stats));
                console.log('[SystemHealth] Full stats object:', data.stats);
              }

              // Update threads
              if (data.stats.threads) {
                setThreads(data.stats.threads);
              }

              // Update ring buffers - check all possible field names
              if (data.stats.ringBuffers) {
                setRingBuffers(data.stats.ringBuffers);
              } else if ((data.stats as any).ring_buffers) {
                setRingBuffers((data.stats as any).ring_buffers);
              } else if ((data.stats as any).ringbuffers) {
                setRingBuffers((data.stats as any).ringbuffers);
              }

              // Update message rates
              if (data.stats.rates) {
                setMessageRatesExtended(data.stats.rates);
              }
            }
          } catch (error) {
            console.error('[SystemHealth] Error parsing status message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[SystemHealth] Status WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[SystemHealth] Status WebSocket closed, reconnecting in 5s...');
          setTimeout(connectSystemStatus, 5000);
        };
      } catch (error) {
        console.error('[SystemHealth] Failed to create status WebSocket:', error);
        setTimeout(connectSystemStatus, 5000);
      }
    }

    // Connect to /usage endpoint for CPU/RAM/GPU metrics
    function connectSystemUsage() {
      const wsUrl = `${protocol}//${window.location.host}/system-usage`;
      console.log('[SystemHealth] Connecting to usage WebSocket:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);
        systemUsageWsRef.current = ws;

        ws.onopen = () => {
          console.log('[SystemHealth] Usage WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const data: UsageUpdateNew = JSON.parse(event.data);

            if (data.type === 'usage_update') {
              setSystemUsage({
                cpu: data.cpu,
                ram: data.ram,
                gpu: data.gpu
              });

              // Also update message rates if provided
              if (data.messagesPerSec) {
                setMessageRatesExtended({
                  totalPerSec: data.messagesPerSec,
                  tradesPerSec: data.tradesPerSec || 0,
                  orderbooksPerSec: data.orderbooksPerSec || 0
                });
              }
            }
          } catch (error) {
            console.error('[SystemHealth] Error parsing usage message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[SystemHealth] Usage WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[SystemHealth] Usage WebSocket closed, reconnecting in 5s...');
          setTimeout(connectSystemUsage, 5000);
        };
      } catch (error) {
        console.error('[SystemHealth] Failed to create usage WebSocket:', error);
        setTimeout(connectSystemUsage, 5000);
      }
    }

    connectSystemStatus();
    connectSystemUsage();

    return () => {
      if (systemStatusWsRef.current) {
        systemStatusWsRef.current.close();
      }
      if (systemUsageWsRef.current) {
        systemUsageWsRef.current.close();
      }
    };
    */
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

  // Normalize message rates to handle both extended API (camelCase) and GPU instance data (snake_case)
  const messageRates = messageRatesExtended
    ? {
        total_per_sec: messageRatesExtended.totalPerSec,
        trades_per_sec: messageRatesExtended.tradesPerSec,
        orderbooks_per_sec: messageRatesExtended.orderbooksPerSec
      }
    : krakenInstance?.usageMetrics?.message_rates;

  const systemConnected = messageRatesExtended !== null || krakenConnected;

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
            {getStatusIcon(systemConnected)}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={systemConnected ? "default" : "destructive"} className="text-xs">
                  {systemConnected ? "Connected" : "Disconnected"}
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

      {/* GPU and DB Service Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GPU Service Monitors */}
        {gpuInstances.map((instance) => {
          const { systemInfo, usageMetrics } = instance;

          return (
            <Card key={instance.id} className="trading-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
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
                  <Badge variant={instance.connected ? "default" : "destructive"} className="text-xs">
                    {instance.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              {/* System Information */}
              {systemInfo && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Cpu className="h-3 w-3" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Cores:</span>{' '}
                      <span className="font-semibold">{systemInfo.cpu_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RAM:</span>{' '}
                      <span className="font-semibold">
                        {(systemInfo.ram_total_mb / 1024).toFixed(1)} GB
                      </span>
                    </div>
                    {systemInfo.gpus && systemInfo.gpus.length > 0 && (
                      <>
                        <div>
                          <span className="text-muted-foreground">GPUs:</span>{' '}
                          <span className="font-semibold">{systemInfo.gpu_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">VRAM:</span>{' '}
                          <span className="font-semibold">
                            {(systemInfo.gpus[0].memory_mb / 1024).toFixed(1)} GB
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Usage Metrics */}
              {usageMetrics && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    Real-time Usage
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* CPU Usage */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">CPU</span>
                        <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.cpu_percent)}`}>
                          {usageMetrics.cpu_percent.toFixed(1)}%
                        </span>
                      </div>

                      {/* CPU Trend Chart */}
                      {instance.usageHistory.length > 1 && (
                        <div className="h-16">
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
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">RAM</span>
                        <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.ram_percent)}`}>
                          {usageMetrics.ram_percent.toFixed(1)}%
                        </span>
                      </div>

                      {/* RAM Trend Chart */}
                      {instance.usageHistory.length > 1 && (
                        <div className="h-16">
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
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">GPU</span>
                          <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.gpu_percent)}`}>
                            {usageMetrics.gpu_percent}%
                          </span>
                        </div>

                        {/* GPU Trend Chart */}
                        {instance.usageHistory.length > 1 && instance.usageHistory.some(h => h.gpu !== undefined) && (
                          <div className="h-16">
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

                  {/* Ring Buffer Status - Only show for GPU Server 1 */}
                  {instance.id === 'gpu1' && Object.keys(ringBuffers).length > 0 && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-border">
                      <h3 className="text-xs font-semibold flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Ring Buffer Status
                      </h3>
                      {Object.entries(ringBuffers).map(([name, stats]) => (
                        <div key={name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {stats.unconsumed.toLocaleString()} / Max: {stats.max12h.toLocaleString()}
                              </span>
                              <span className={`text-sm font-bold ${getUtilizationColor(stats.utilization)}`}>
                                {stats.utilization.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Last Update */}
                  <div className="text-xs text-muted-foreground text-right mt-2">
                    {new Date(usageMetrics.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {instance.connected && !usageMetrics && (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-6 w-6 animate-pulse mx-auto mb-2" />
                  <p className="text-xs">Waiting for usage data...</p>
                </div>
              )}

              {/* Disconnected State */}
              {!instance.connected && (
                <div className="text-center py-4 text-muted-foreground">
                  <WifiOff className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xs">Not connected</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

        {/* DB Service Monitors */}
        {dbInstances.map((instance) => {
          const { systemInfo, usageMetrics } = instance;

          return (
            <Card key={instance.id} className="trading-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{instance.name}</span>
                        {systemInfo && (
                          <span className="text-xs font-mono text-muted-foreground">
                            ({systemInfo.hostname})
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-normal text-muted-foreground">{instance.host}</div>
                    </div>
                  </div>
                  <Badge variant={instance.connected ? "default" : "destructive"} className="text-xs">
                    {instance.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* System Information */}
                {systemInfo && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                    <h3 className="text-xs font-semibold flex items-center gap-2">
                      <Cpu className="h-3 w-3" />
                      System Information
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Cores:</span>{' '}
                        <span className="font-semibold">{systemInfo.cpu_count}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">RAM:</span>{' '}
                        <span className="font-semibold">
                          {(systemInfo.ram_total_mb / 1024).toFixed(1)} GB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time Usage Metrics */}
                {usageMetrics && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      Real-time Usage
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      {/* CPU Usage */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">CPU</span>
                          <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.cpu_percent)}`}>
                            {usageMetrics.cpu_percent.toFixed(1)}%
                          </span>
                        </div>

                        {/* CPU Trend Chart */}
                        {instance.usageHistory.length > 1 && (
                          <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={instance.usageHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                              <XAxis hide />
                              <YAxis domain={[0, 100]} hide />
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
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">RAM</span>
                          <span className={`text-sm font-bold ${getUtilizationColor(usageMetrics.ram_percent)}`}>
                            {usageMetrics.ram_percent.toFixed(1)}%
                          </span>
                        </div>

                        {/* RAM Trend Chart */}
                        {instance.usageHistory.length > 1 && (
                          <div className="h-16">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={instance.usageHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.1)" />
                                <XAxis hide />
                                <YAxis domain={[0, 100]} hide />
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
                    </div>

                    {/* Last Update */}
                    <div className="text-xs text-muted-foreground text-right mt-2">
                      {new Date(usageMetrics.timestamp * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                )}

              {/* Loading State */}
              {instance.connected && !usageMetrics && (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-6 w-6 animate-pulse mx-auto mb-2" />
                  <p className="text-xs">Waiting for usage data...</p>
                </div>
              )}

              {/* Disconnected State */}
              {!instance.connected && (
                <div className="text-center py-4 text-muted-foreground">
                  <WifiOff className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xs">Not connected</p>
                </div>
              )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Threads Status */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Thread Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threads.length > 0 ? (
            <div className="space-y-3">
              {threads.map((thread) => (
                <div key={thread.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{thread.name}</p>
                      <Badge variant={
                        thread.state === 'running' ? 'default' :
                        thread.state === 'error' ? 'destructive' : 'secondary'
                      }>
                        {thread.state}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Processed: {thread.processed.toLocaleString()}</span>
                      {thread.errors > 0 && <span className="text-loss">Errors: {thread.errors}</span>}
                      <span className={
                        thread.avgLatencyUs / 1000 < 100 ? 'text-success' :
                        thread.avgLatencyUs / 1000 < 500 ? 'text-warning' : 'text-loss'
                      }>
                        Latency: {(thread.avgLatencyUs / 1000).toFixed(2)}ms
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p className="text-sm">Waiting for thread data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
