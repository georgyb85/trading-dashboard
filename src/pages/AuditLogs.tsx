import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wifi, WifiOff, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { joinUrl } from "@/lib/url";

// Event table options from the image
const eventTableOptions = [
  "live_model_events",
  "live_predictions",
  "live_orders_intent",
  "live_orders_events",
  "live_fills",
  "live_positions",
  "live_risk_events",
  "live_debug_actions",
  "live_log_events",
];

// Severity badge component
function SeverityBadge({ severity }: { severity: "ERROR" | "WARNING" | "INFO" }) {
  const severityConfig = {
    ERROR: { icon: AlertCircle, className: "bg-red-500/20 text-red-500 border-red-500/30" },
    WARNING: { icon: AlertTriangle, className: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" },
    INFO: { icon: Info, className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  };

  const { icon: Icon, className } = severityConfig[severity];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {severity}
    </Badge>
  );
}

// Sample log events from the image
const sampleLogEvents = [
  {
    id: "1",
    time: "2025-12-17 20:18:30.123",
    severity: "ERROR" as const,
    source: "Trading Gateway",
    eventType: "Gateway Reject",
    message: "Order rejected by exchange: 'PostOnly order would cross market.'",
    modelId: "Model A",
  },
  {
    id: "2",
    time: "2025-12-17 20:18:25.567",
    severity: "WARNING" as const,
    source: "Trading Gateway",
    eventType: "Gateway Reject",
    message: "Order rejected by exchange: 'PostOnly order would cross market.'",
    modelId: "Model A",
  },
  {
    id: "3",
    time: "2025-12-17 20:18:25.567",
    severity: "WARNING" as const,
    source: "Configuration Service",
    eventType: "Config Error",
    message: "Failed to load model config for 'Model C'. Using default settings.",
    modelId: "Model C",
  },
  {
    id: "4",
    time: "2025-12-17 20:18:10.901",
    severity: "WARNING" as const,
    source: "Market Data Source",
    eventType: "Staleness Block",
    message: "Price data for 'ETH-USD' is stale (>500ms). Trading paused for 'Model B'.",
    modelId: "Model B",
  },
  {
    id: "5",
    time: "2025-12-17 20:17:55.432",
    severity: "ERROR" as const,
    source: "Risk Engine",
    eventType: "Risk Check Failed",
    message: "Max position size exceeded for 'SOL-USDT'. Order blocked.",
    modelId: "Model B",
  },
  {
    id: "6",
    time: "2025-12-17 20:17:40.000",
    severity: "INFO" as const,
    source: "Order Manager",
    eventType: "Order Placed",
    message: "Limit Buy order for 1.5 BTC @ $60,000 sent to Binance.",
    modelId: "Model A",
  },
  {
    id: "7",
    time: "2025-12-17 20:17:43.500",
    severity: "INFO" as const,
    source: "Order Manager",
    eventType: "Order Placed",
    message: "Limit Buy order for 1.5 BTC @ $60,000 sent to Binance.",
    modelId: "Model A",
  },
  {
    id: "8",
    time: "2025-12-17 20:17:45.321",
    severity: "INFO" as const,
    source: "Trading Gateway",
    eventType: "Risk Engine",
    message: "Limit Buy order for 1.00 BTC @ $60 to placed.",
    modelId: "Model A",
  },
];

export default function AuditLogs() {
  const [logEvents, setLogEvents] = useState(sampleLogEvents);
  const [wsConnected, setWsConnected] = useState(false);
  const [streamingConnected, setStreamingConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Query form state
  const [eventTable, setEventTable] = useState("live_model_events");
  const [sinceMs, setSinceMs] = useState("");
  const [untilMs, setUntilMs] = useState("");
  const [modelId, setModelId] = useState("");
  const [limit, setLimit] = useState("1");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const logSnapshotPath = `${config.traderRestBasePath}/live/logs`;
  const logWsPath = config.krakenLogsWsPath;

  // Connect to WebSocket for real-time logs
  useEffect(() => {
    const wsUrl = joinUrl(config.krakenWsBaseUrl, config.krakenLogsWsPath);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setStreamingConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "log_event") {
            setLogEvents((prev) => [data.event, ...prev].slice(0, 100));
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setStreamingConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
        setStreamingConnected(false);
      };

      return () => {
        ws.close();
      };
    } catch (e) {
      console.error("Failed to connect to WebSocket:", e);
      // Keep showing sample data
    }
  }, []);

  const handleQuery = async () => {
    setIsQuerying(true);
    setQueryResults(null);

    try {
      const params = new URLSearchParams();
      if (sinceMs) params.append("since_ms", sinceMs);
      if (untilMs) params.append("until_ms", untilMs);
      if (modelId) params.append("model_id", modelId);
      if (limit) params.append("limit", limit);

      const response = await fetch(`/api/events/${eventTable}?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setQueryResults(data.events || data);
      } else {
        console.error("Query failed:", response.statusText);
        // Show sample results for demo
        setQueryResults(sampleLogEvents.slice(0, parseInt(limit) || 10));
      }
    } catch (e) {
      console.error("Query error:", e);
      // Show sample results for demo
      setQueryResults(sampleLogEvents.slice(0, parseInt(limit) || 10));
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit & Logs</h1>
        <p className="text-muted-foreground">Recent operational events for debugging.</p>
      </div>

      {/* Recent Warnings/Errors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Warnings/Errors</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-medium">Time</TableHead>
                  <TableHead className="text-xs font-medium">Severity</TableHead>
                  <TableHead className="text-xs font-medium">Source</TableHead>
                  <TableHead className="text-xs font-medium">Event Type</TableHead>
                  <TableHead className="text-xs font-medium min-w-[300px]">Message</TableHead>
                  <TableHead className="text-xs font-medium">Model ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No log events
                    </TableCell>
                  </TableRow>
                ) : (
                  logEvents.map((event) => (
                    <TableRow key={event.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {event.time}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={event.severity} />
                      </TableCell>
                      <TableCell className="text-sm">{event.source}</TableCell>
                      <TableCell className="text-sm">{event.eventType}</TableCell>
                      <TableCell className="text-sm">{event.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{event.modelId}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Durable History Query */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Durable History Query</CardTitle>
          <CardDescription>Query the event journal for comparisons.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Event Table</Label>
              <Select value={eventTable} onValueChange={setEventTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTableOptions.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Since (ms)</Label>
              <Input
                type="text"
                placeholder="Date, and Time"
                value={sinceMs}
                onChange={(e) => setSinceMs(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Until (ms)</Label>
              <Input
                type="text"
                placeholder="Date, and Time"
                value={untilMs}
                onChange={(e) => setUntilMs(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Model ID (optional)</Label>
              <Input
                type="text"
                placeholder=""
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Limit</Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>

            <Button onClick={handleQuery} disabled={isQuerying}>
              {isQuerying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Querying...
                </>
              ) : (
                "Query"
              )}
            </Button>
          </div>

          {/* Query Results */}
          {queryResults && (
            <div className="mt-6">
              <div className="text-sm text-muted-foreground mb-2">
                Query returned {queryResults.length} result(s)
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-medium">Time</TableHead>
                      <TableHead className="text-xs font-medium">Severity</TableHead>
                      <TableHead className="text-xs font-medium">Source</TableHead>
                      <TableHead className="text-xs font-medium">Event Type</TableHead>
                      <TableHead className="text-xs font-medium">Message</TableHead>
                      <TableHead className="text-xs font-medium">Model ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResults.map((event, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {event.time || event.timestamp || "-"}
                        </TableCell>
                        <TableCell>
                          {event.severity ? (
                            <SeverityBadge severity={event.severity} />
                          ) : (
                            <Badge variant="outline">-</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{event.source || "-"}</TableCell>
                        <TableCell className="text-sm">{event.eventType || event.event_type || "-"}</TableCell>
                        <TableCell className="text-sm">{event.message || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{event.modelId || event.model_id || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div>
          Data Sources:{" "}
          <span className="text-primary">{logSnapshotPath}</span> (Snapshot),{" "}
          <span className="text-primary">{logWsPath}</span> (Streaming),{" "}
          <span className="text-primary">/api/events/{"{table}"}</span> (Durable History).
        </div>
        <div className="flex items-center gap-1.5">
          WebSocket:
          {wsConnected || streamingConnected ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />{" "}
              <span className="text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-red-500" />{" "}
              <span className="text-red-500">Disconnected</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
