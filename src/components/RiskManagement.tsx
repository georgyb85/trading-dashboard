import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Pause, Play, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Speedometer-style gauge component
function GaugeChart({
  value,
  max,
  label,
  sublabel,
  format = "currency",
}: {
  value: number;
  max: number;
  label: string;
  sublabel?: string;
  format?: "currency" | "percent" | "number";
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const isHealthy = percentage < 60;
  const isWarning = percentage >= 60 && percentage < 85;

  // Needle angle: -90 (left) to 90 (right) degrees
  const needleAngle = -90 + (percentage / 100) * 180;

  const formatValue = (val: number) => {
    if (format === "currency") {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    }
    if (format === "percent") return `${val}%`;
    return val.toString();
  };

  const formatMax = (val: number) => {
    if (format === "currency") {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    }
    if (format === "percent") return `${val}%`;
    return val.toString();
  };

  const getColor = () => {
    if (isHealthy) return "#22c55e";
    if (isWarning) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] text-muted-foreground mb-1 text-center">{label}</div>
      <div className="relative w-24 h-14">
        <svg viewBox="0 0 100 52" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
            opacity="0.3"
          />
          {/* Colored arc based on percentage */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={getColor()}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 126} 126`}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (-90 + (tick / 100) * 180) * (Math.PI / 180);
            const x1 = 50 + 35 * Math.cos(angle);
            const y1 = 50 + 35 * Math.sin(angle);
            const x2 = 50 + 40 * Math.cos(angle);
            const y2 = 50 + 40 * Math.sin(angle);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                opacity="0.5"
              />
            );
          })}
          {/* Needle */}
          <g transform={`rotate(${needleAngle}, 50, 50)`}>
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="18"
              stroke={getColor()}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="4" fill={getColor()} />
          </g>
        </svg>
      </div>
      <div className="text-center mt-0.5">
        <span className="text-xs font-semibold">
          {formatValue(value)} / {formatMax(max)}
        </span>
        <span className="text-[10px] text-muted-foreground ml-1">({percentage.toFixed(1)}%)</span>
      </div>
      {sublabel && (
        <span className="text-[9px] text-green-500 mt-0.5">{sublabel}</span>
      )}
    </div>
  );
}

// Progress bar with percentage
function LimitProgressBar({
  used,
  limit,
  format = "number",
}: {
  used: number;
  limit: number;
  format?: "number" | "percent" | "currency";
}) {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isHealthy = percentage < 60;
  const isWarning = percentage >= 60 && percentage < 85;

  const formatVal = (val: number) => {
    if (format === "currency") {
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
      return `$${val}`;
    }
    if (format === "percent") return `${val}%`;
    return val.toString();
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>
          {formatVal(used)}/{formatVal(limit)}
        </span>
        <span className="text-muted-foreground">({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isHealthy ? "bg-green-500" : isWarning ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Mock data for the chart
const historicalData = [
  { time: "00:00", modelA: 200000, modelB: 150000, total: 350000 },
  { time: "02:00", modelA: 250000, modelB: 180000, total: 430000 },
  { time: "04:00", modelA: 300000, modelB: 200000, total: 500000 },
  { time: "06:00", modelA: 450000, modelB: 350000, total: 800000 },
  { time: "08:00", modelA: 500000, modelB: 400000, total: 900000 },
  { time: "10:00", modelA: 550000, modelB: 450000, total: 1000000 },
  { time: "12:00", modelA: 480000, modelB: 380000, total: 860000 },
  { time: "14:00", modelA: 420000, modelB: 320000, total: 740000 },
  { time: "16:00", modelA: 380000, modelB: 280000, total: 660000 },
  { time: "18:00", modelA: 350000, modelB: 250000, total: 600000 },
];

// Mock model data
const modelLimitsData = [
  {
    id: "Model A",
    name: "Alpha",
    active: true,
    maxPositions: { used: 20, limit: 50 },
    maxEquity: { used: 8, limit: 15 },
    maxNotional: { used: 450000, limit: 1000000 },
    exposure: "BTC: $20k (P) / $200k (F) | ETH: $5k (P) / $150k (F)",
  },
  {
    id: "Model B",
    name: "Beta",
    active: true,
    maxPositions: { used: 10, limit: 30 },
    maxEquity: { used: 12, limit: 20 },
    maxNotional: { used: 600000, limit: 1500000 },
    exposure: "SOL: $10k (P) / $300k (F) | ADA: $0 (P) / $100k (F)",
  },
  {
    id: "Model C",
    name: "Gamma",
    active: false,
    maxPositions: { used: 0, limit: 25 },
    maxEquity: { used: 0, limit: 10 },
    maxNotional: { used: 0, limit: 500000 },
    exposure: "-",
  },
];

// Mock pending exposure data
const pendingExposureData = [
  {
    clOrdId: "clOrdId_pending_001",
    symbol: "BTC-USD",
    side: "Buy",
    type: "Limit",
    qty: 0.5,
    notionalValue: 30000,
    age: 12,
    status: "Normal",
  },
  {
    clOrdId: "clOrdId_pending_002",
    symbol: "ETH-USD",
    side: "Sell",
    type: "Market",
    qty: 10,
    notionalValue: 25000,
    age: 5,
    status: "Normal",
  },
  {
    clOrdId: "clOrdId_pending_003",
    symbol: "SOL-USDT",
    side: "Buy",
    type: "Limit",
    qty: 100,
    notionalValue: 4500,
    age: 75,
    status: "WARNING",
  },
];

// Mock breach log data
const breachLogData = [
  {
    timestamp: "2023-10-27 15:30:12",
    modelId: "Model B",
    limitType: "Max Notional",
    attemptedValue: "$1.6M",
    limitValue: "$1.5M",
  },
  {
    timestamp: "2023-10-27 12:15:45",
    modelId: "Model A",
    limitType: "Max Positions",
    attemptedValue: "51",
    limitValue: "-",
  },
  {
    timestamp: "2023-10-27 09:45:00",
    modelId: "Model C",
    limitType: "Max Equity %",
    attemptedValue: "11%",
    limitValue: "10%",
  },
];

export function RiskManagement() {
  const [circuitBreakerState, setCircuitBreakerState] = useState<"healthy" | "paused">("healthy");
  const [modelStates, setModelStates] = useState<Record<string, boolean>>({
    "Model A": true,
    "Model B": true,
    "Model C": false,
  });
  const [dateRange, setDateRange] = useState("last24h");

  const handlePauseAll = () => {
    setCircuitBreakerState("paused");
    setModelStates({
      "Model A": false,
      "Model B": false,
      "Model C": false,
    });
  };

  const handleResumeTrading = () => {
    setCircuitBreakerState("healthy");
  };

  const toggleModelActive = (modelId: string) => {
    setModelStates((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk & Exposure</h1>
      </div>

      {/* Circuit Breaker & Global Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium">Circuit Breaker & Global Controls</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Circuit Breaker State:</span>
                {circuitBreakerState === "healthy" ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    HEALTHY (All systems nominal)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    <Pause className="w-3 h-3 mr-1" />
                    PAUSED
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={circuitBreakerState === "paused"}>
                    <Pause className="w-3 h-3 mr-1" />
                    PAUSE ALL ENTRIES (Deactivate All Models)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Pause All Trading</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will deactivate all models and pause all new entries. Existing positions will
                      remain open.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePauseAll} className="bg-destructive">
                      Confirm Pause
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={circuitBreakerState === "healthy"}
                    className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    RESUME TRADING (Requires Confirmation)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Resume Trading</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will re-enable the circuit breaker and allow trading to resume. You will need
                      to manually activate individual models.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResumeTrading} className="bg-green-600">
                      Confirm Resume
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <span className="text-[10px] text-muted-foreground">
                Requires manual confirmation to re-enable trading.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Limits vs Usage + Model Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Global Limits vs Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3">Global Limits vs Usage (Aggregate)</div>
            <div className="flex justify-between items-start">
              <GaugeChart
                value={1200000}
                max={5000000}
                label="Total Notional Exposure"
                format="currency"
              />
              <GaugeChart
                value={15}
                max={50}
                label="Total Equity Used"
                sublabel="Healthy"
                format="percent"
              />
              <GaugeChart
                value={45}
                max={200}
                label="Total Open Positions"
                format="number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Model Limits vs Usage */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Model Limits vs Usage</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Model ID</TableHead>
                  <TableHead className="text-xs">Active</TableHead>
                  <TableHead className="text-xs">Max Positions (Used/Limit)</TableHead>
                  <TableHead className="text-xs">Max Equity % (Used/Limit)</TableHead>
                  <TableHead className="text-xs">Max Notional (Used/Limit)</TableHead>
                  <TableHead className="text-xs">Pending vs Filled Exposure (Top Symbols)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelLimitsData.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">
                      {model.id}{" "}
                      <span className="text-muted-foreground text-xs">({model.name})</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={modelStates[model.id]}
                          onCheckedChange={() => toggleModelActive(model.id)}
                          disabled={circuitBreakerState === "paused"}
                        />
                        <span
                          className={`text-xs ${
                            modelStates[model.id] ? "text-green-500" : "text-muted-foreground"
                          }`}
                        >
                          {modelStates[model.id] ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <LimitProgressBar
                        used={model.maxPositions.used}
                        limit={model.maxPositions.limit}
                        format="number"
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <LimitProgressBar
                        used={model.maxEquity.used}
                        limit={model.maxEquity.limit}
                        format="percent"
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <LimitProgressBar
                        used={model.maxNotional.used}
                        limit={model.maxNotional.limit}
                        format="currency"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{model.exposure}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Pending Exposure Queue View */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Pending Exposure Queue View</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Date Range:</span>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last1h">Last Hour</SelectItem>
                  <SelectItem value="last24h">Last 24 Hours</SelectItem>
                  <SelectItem value="last7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">clOrdId</TableHead>
                <TableHead className="text-xs">Symbol</TableHead>
                <TableHead className="text-xs">Side</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Qty</TableHead>
                <TableHead className="text-xs">Notional Value</TableHead>
                <TableHead className="text-xs">Age (s)</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingExposureData.map((item) => (
                <TableRow key={item.clOrdId}>
                  <TableCell className="font-mono text-xs">{item.clOrdId}</TableCell>
                  <TableCell>{item.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.side === "Buy"
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }
                    >
                      {item.side}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell>{formatCurrency(item.notionalValue)}</TableCell>
                  <TableCell>{item.age}s</TableCell>
                  <TableCell>
                    {item.status === "Normal" ? (
                      <span className="text-green-500 text-xs">Normal</span>
                    ) : (
                      <span className="text-yellow-500 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        WARNING (&gt;60s timeout risk)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Historical Exposure (Time Series) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Historical Exposure (Time Series)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--muted))" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--muted))" }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  domain={[0, 1200000]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${(value / 1000).toFixed(0)}k`, ""]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="modelA"
                  name="Model A"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="modelB"
                  name="Model B"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breach Log (Recent Limit Breaches) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Breach Log (Recent Limit Breaches)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">Model ID</TableHead>
                <TableHead className="text-xs">Limit Type</TableHead>
                <TableHead className="text-xs">Attempted Value</TableHead>
                <TableHead className="text-xs">Limit Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breachLogData.map((breach, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {breach.timestamp}
                  </TableCell>
                  <TableCell>{breach.modelId}</TableCell>
                  <TableCell>{breach.limitType}</TableCell>
                  <TableCell className="text-red-500">{breach.attemptedValue}</TableCell>
                  <TableCell>{breach.limitValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-xs text-muted-foreground border-t pt-4">
        APIs: GET{" "}
        <span className="text-primary">/api/live/risk/limits</span>,{" "}
        <span className="text-primary">/api/live/risk/exposure</span>,{" "}
        <span className="text-primary">/api/live/risk/exposure_history</span>,{" "}
        <span className="text-primary">/api/live/risk/cooldowns</span>,{" "}
        <span className="text-primary">/api/live/risk/breaches</span>
      </div>
    </div>
  );
}
