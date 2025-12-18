import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wifi,
  WifiOff,
  Loader2,
  TrendingUp,
  TrendingDown,
  X,
  Send,
  CheckCircle2,
  XCircle,
  CircleDot,
  FileDown,
  Eye,
} from "lucide-react";
import { useAccountState } from "@/hooks/useAccountState";
import { useStatusStream } from "@/hooks/useStatusStream";

// Order status type
type OrderStatus = "Filled" | "Open" | "Rejected" | "Cancelled";

// Order interface
interface Order {
  id: string;
  status: OrderStatus;
  clientOrderId: string;
  exchange: string;
  symbol: string;
  side: "Buy" | "Sell";
  type: "Limit" | "Market" | "Stop";
  quantity: string;
  price: string | null;
  time: string;
}

// Mock data for non-Kraken exchanges
const mockOrders: Order[] = [
  {
    id: "m1",
    status: "Filled",
    clientOrderId: "clOrdId_123abc",
    exchange: "Binance",
    symbol: "BTC-USD",
    side: "Buy",
    type: "Limit",
    quantity: "1.5 BTC",
    price: "$60,000.00",
    time: "2023-10-27 14:30:45.123",
  },
  {
    id: "m2",
    status: "Open",
    clientOrderId: "clOrdId_456def",
    exchange: "Coinbase",
    symbol: "ETH-USD",
    side: "Sell",
    type: "Limit",
    quantity: "10 ETH",
    price: "$4,100.00",
    time: "2023-10-27 14:29:10.567",
  },
  {
    id: "m3",
    status: "Open",
    clientOrderId: "clOrdId_456def",
    exchange: "Coinbase",
    symbol: "ETH-USD",
    side: "Buy",
    type: "Limit",
    quantity: "10 ETH",
    price: "$4,100.00",
    time: "2023-10-27 14:29:10.567",
  },
  {
    id: "m4",
    status: "Rejected",
    clientOrderId: "clOrdId_456def",
    exchange: "Kraken",
    symbol: "SOL-USDT",
    side: "Buy",
    type: "Market",
    quantity: "50 SOL",
    price: "Market",
    time: "2023-10-27 14:29:10.523",
  },
  {
    id: "m5",
    status: "Cancelled",
    clientOrderId: "clOrdId_123abc",
    exchange: "Binance",
    symbol: "BTC-USD",
    side: "Buy",
    type: "Stop",
    quantity: "1.5 SOL",
    price: "$60,000.00",
    time: "2023-10-27 14:30:45.123",
  },
  {
    id: "m6",
    status: "Open",
    clientOrderId: "clOrdId_456def",
    exchange: "Coinbase",
    symbol: "ETH-USD",
    side: "Sell",
    type: "Limit",
    quantity: "10 ETH",
    price: "$4,100.00",
    time: "2023-10-27 14:29:10.567",
  },
  {
    id: "m7",
    status: "Open",
    clientOrderId: "clOrdId_456def",
    exchange: "Coinbase",
    symbol: "ETH-USD",
    side: "Sell",
    type: "Limit",
    quantity: "10 ETH",
    price: "$4,100.00",
    time: "2023-10-27 14:29:10.567",
  },
  {
    id: "m8",
    status: "Rejected",
    clientOrderId: "clOrdId_456def",
    exchange: "Kraken",
    symbol: "SOL-USDT",
    side: "Sell",
    type: "Stop",
    quantity: "50 SOL",
    price: "Market",
    time: "2023-10-27 14:29:10.588",
  },
  {
    id: "m9",
    status: "Cancelled",
    clientOrderId: "clOrdId_456def",
    exchange: "Kraken",
    symbol: "SOL-USDT",
    side: "Buy",
    type: "Market",
    quantity: "50 SOL",
    price: "$60,000.00",
    time: "2023-10-27 14:29:10.567",
  },
];

// Single stage node component
function StageNode({
  label,
  color,
  children
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "bg-cyan-500/20 border-cyan-500 text-cyan-500",
    red: "bg-red-400/20 border-red-400 text-red-400",
    green: "bg-green-500/20 border-green-500 text-green-500",
    yellow: "bg-yellow-500/20 border-yellow-500 text-yellow-500",
    destructive: "bg-red-500/20 border-red-500 text-red-500",
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <span className="text-xs text-muted-foreground mb-2">{label}</span>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${colorClasses[color]}`}>
        {children}
      </div>
    </div>
  );
}

// Arrow connector with timing label
function ArrowConnector({ timing, color }: { timing?: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-500",
    red: "text-red-400",
    green: "text-green-500",
    yellow: "text-yellow-500",
  };

  return (
    <div className="flex flex-col items-center flex-shrink-0 -mx-1">
      <div className="h-5" /> {/* Spacer to align with labels */}
      <div className="flex items-center h-12">
        <svg width="80" height="24" viewBox="0 0 80 24" className={colorClasses[color]}>
          <defs>
            <marker id={`arrow-${color}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>
          <line x1="0" y1="12" x2="72" y2="12" stroke="currentColor" strokeWidth="2" markerEnd={`url(#arrow-${color})`} />
        </svg>
      </div>
      {timing && (
        <span className={`text-[10px] mt-1 whitespace-nowrap ${colorClasses[color]}`}>{timing}</span>
      )}
    </div>
  );
}

// Order Flow Visualization Component
function OrderFlowVisualization() {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Order Flow Visualization</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Order #12345678 - BTC-USD - Buy - Limit - 1.5 BTC @ $60,000
        </p>

        <div className="flex items-start justify-center">
          <StageNode label="Intent" color="cyan">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </StageNode>

          <ArrowConnector timing="intent_to_sent_ms: 15ms" color="cyan" />

          <StageNode label="Sent" color="red">
            <Send className="w-5 h-5" />
          </StageNode>

          <ArrowConnector timing="sent_to_ack_ms: 45ms" color="red" />

          <StageNode label="Ack" color="green">
            <CheckCircle2 className="w-5 h-5" />
          </StageNode>

          <ArrowConnector timing="ack_to_fill_ms: 120ms" color="green" />

          <StageNode label="Fill" color="yellow">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-6 4 5 5-7" />
            </svg>
          </StageNode>

          <ArrowConnector color="yellow" />

          <StageNode label="Fill/Reject" color="destructive">
            <XCircle className="w-5 h-5" />
          </StageNode>
        </div>
      </CardContent>
    </Card>
  );
}

// Status indicator component
function StatusIndicator({ status }: { status: OrderStatus }) {
  const config = {
    Filled: { color: "bg-green-500", text: "text-green-500" },
    Open: { color: "bg-yellow-500", text: "text-yellow-500" },
    Rejected: { color: "bg-red-500", text: "text-red-500" },
    Cancelled: { color: "bg-gray-500", text: "text-gray-500" },
  };

  const { color, text } = config[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className={`text-sm ${text}`}>{status}</span>
    </div>
  );
}

export function OrdersTable() {
  const { orders, recentFinalOrders, connected, error } = useAccountState();
  const { connected: wsConnected } = useStatusStream();

  // Filter state
  const [modelFilter, setModelFilter] = useState("All");
  const [exchangeFilter, setExchangeFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [timeWindow, setTimeWindow] = useState("Last Hour");

  // Convert real Kraken orders to unified format
  const krakenOrders: Order[] = useMemo(() => {
    const allKrakenOrders = [...orders, ...recentFinalOrders];
    return allKrakenOrders.map((order) => {
      const statusUpper = order.status.toUpperCase();
      let status: OrderStatus = "Open";
      if (statusUpper === "FILLED") status = "Filled";
      else if (statusUpper === "CANCELED" || statusUpper === "CANCELLED" || statusUpper === "EXPIRED")
        status = "Cancelled";
      else if (statusUpper === "REJECTED" || statusUpper === "FAILED") status = "Rejected";
      else if (
        statusUpper === "NEW" ||
        statusUpper === "PENDING_NEW" ||
        statusUpper === "PARTIALLY_FILLED"
      )
        status = "Open";

      const formatTime = (ns: number) => {
        const date = new Date(ns / 1000000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        const ms = String(date.getMilliseconds()).padStart(3, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
      };

      const formatCurrency = (value: string) => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(parseFloat(value));
      };

      return {
        id: order.id,
        status,
        clientOrderId: order.clientId || `ord_${order.id.slice(0, 8)}`,
        exchange: "Kraken",
        symbol: order.symbol,
        side: order.side === "Buy" ? "Buy" : "Sell",
        type: (order.type as "Limit" | "Market" | "Stop") || "Limit",
        quantity: `${parseFloat(order.quantity).toFixed(4)} ${order.symbol.split("/")[0] || ""}`,
        price: order.price ? formatCurrency(order.price) : "Market",
        time: formatTime(order.lastUpdateNs),
      };
    });
  }, [orders, recentFinalOrders]);

  // Combine real Kraken orders with mock data for other exchanges
  const allOrders = useMemo(() => {
    // Filter mock orders to exclude Kraken (we use real data for Kraken)
    const nonKrakenMockOrders = mockOrders.filter((o) => o.exchange !== "Kraken");
    // Add mock Kraken orders if we have no real Kraken orders
    const krakenMockOrders = krakenOrders.length === 0 ? mockOrders.filter((o) => o.exchange === "Kraken") : [];
    return [...krakenOrders, ...nonKrakenMockOrders, ...krakenMockOrders];
  }, [krakenOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (exchangeFilter !== "All" && order.exchange !== exchangeFilter) return false;
      if (stateFilter !== "All" && order.status !== stateFilter) return false;
      // Model filter would need model data - skipping for now
      return true;
    });
  }, [allOrders, exchangeFilter, stateFilter]);

  // Loading state
  if (!connected && !error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Connecting to Account State...</h3>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Full order lifecycle visibility.</p>
      </div>

      {/* Order Flow Visualization */}
      <OrderFlowVisualization />

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Filters & Actions</h3>

          <div className="flex flex-wrap items-end gap-4">
            {/* Model Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Model</label>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Model A">Model A</SelectItem>
                  <SelectItem value="Model B">Model B</SelectItem>
                  <SelectItem value="Model C">Model C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exchange Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Exchange</label>
              <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Coinbase">Coinbase</SelectItem>
                  <SelectItem value="Kraken">Kraken</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* State Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">State</label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Filled">Filled</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Window */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Time Window</label>
              <div className="flex gap-1">
                {["Last Hour", "Last 24h", "Custom Range"].map((tw) => (
                  <Button
                    key={tw}
                    variant={timeWindow === tw ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeWindow(tw)}
                    className="text-xs"
                  >
                    {tw}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-auto">
              <Button variant="destructive" size="sm" className="text-xs">
                Cancel Order (if API provided)
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                View raw exchange ordId mapping
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <FileDown className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Live Table (WS) + History (REST)</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-xs font-medium">Client Order ID</TableHead>
                  <TableHead className="text-xs font-medium">Exchange</TableHead>
                  <TableHead className="text-xs font-medium">Symbol</TableHead>
                  <TableHead className="text-xs font-medium">Side</TableHead>
                  <TableHead className="text-xs font-medium">Type</TableHead>
                  <TableHead className="text-xs font-medium">Quantity</TableHead>
                  <TableHead className="text-xs font-medium">Price</TableHead>
                  <TableHead className="text-xs font-medium">Time</TableHead>
                  <TableHead className="text-xs font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/20">
                      <TableCell>
                        <StatusIndicator status={order.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{order.clientOrderId}</TableCell>
                      <TableCell>{order.exchange}</TableCell>
                      <TableCell className="font-medium">{order.symbol}</TableCell>
                      <TableCell>
                        <Badge
                          variant={order.side === "Buy" ? "default" : "secondary"}
                          className={
                            order.side === "Buy"
                              ? "bg-green-500/20 text-green-500 border-green-500/30"
                              : "bg-red-500/20 text-red-500 border-red-500/30"
                          }
                        >
                          {order.side === "Buy" ? (
                            <>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Buy
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Sell
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.quantity}</TableCell>
                      <TableCell className="font-mono text-sm">{order.price}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {order.time}
                      </TableCell>
                      <TableCell>
                        {order.status === "Open" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Cancel Order"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div>
          Data Sources: Primary (<span className="text-primary">/account WS</span> +{" "}
          <span className="text-primary">/api/account/order-history</span>). Enhanced with{" "}
          <span className="text-primary">/api/live/orders</span>.
        </div>
        <div className="flex items-center gap-1.5">
          WebSocket:
          {wsConnected || connected ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />{" "}
              <span className="text-green-500">Connected (Last message: 1s ago)</span>
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
