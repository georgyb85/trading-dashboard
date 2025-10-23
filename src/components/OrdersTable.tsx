import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, WifiOff, Loader2, TrendingUp, TrendingDown, X, History, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useAccountState } from "@/hooks/useAccountState";
import { useMemo, useState } from "react";
import { OrderEntry } from "@/types/account";

export function OrdersTable() {
  const { orders, recentFinalOrders, connected, error } = useAccountState();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Separate orders by status
  // Note: WebSocket only sends active orders (PENDING_NEW, NEW, PARTIALLY_FILLED)
  // Terminal states (FILLED, CANCELED, EXPIRED, REJECTED) are removed via 'final' message type
  const { openOrders, filledOrders, cancelledOrders } = useMemo(() => {
    const open: OrderEntry[] = [];
    const filled: OrderEntry[] = [];
    const cancelled: OrderEntry[] = [];

    console.log('📊 OrdersTable received', orders.length, 'orders from WebSocket');

    orders.forEach(order => {
      const status = order.status.toUpperCase();

      // Terminal states - these should not appear in WebSocket feed but handle legacy data
      if (status === 'FILLED') {
        filled.push(order);
      } else if (status === 'CANCELED' || status === 'CANCELLED' || status === 'FAILED' || status === 'EXPIRED' || status === 'REJECTED') {
        cancelled.push(order);
      } else {
        // Active states: PENDING_NEW, NEW, PARTIALLY_FILLED, etc.
        open.push(order);
      }
    });

    console.log('📊 Separated:', open.length, 'open,', filled.length, 'filled,', cancelled.length, 'cancelled');
    return { openOrders: open, filledOrders: filled, cancelledOrders: cancelled };
  }, [orders]);

  const formatNumber = (value: string, decimals: number = 4) => {
    return parseFloat(value).toFixed(decimals);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(value));
  };

  const formatTime = (ns: number) => {
    const date = new Date(ns / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3, // Show milliseconds
      hour12: false
    });
  };

  const formatTimeWithMs = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline" className="text-xs">UNKNOWN</Badge>;
    const statusUpper = status.toUpperCase();
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      // Legacy status values
      'CREATED': { variant: 'secondary', color: 'text-primary' },
      'PENDINGSEND': { variant: 'secondary', color: 'text-warning' },
      'ACKNOWLEDGED': { variant: 'default', color: 'text-success' },
      'PARTIALLYFILLED': { variant: 'default', color: 'text-primary' },
      'FILLED': { variant: 'outline', color: 'text-success' },
      'CANCELPENDING': { variant: 'secondary', color: 'text-warning' },
      'CANCELLED': { variant: 'destructive', color: 'text-loss' },
      'FAILED': { variant: 'destructive', color: 'text-loss' },
      // New API status values
      'PENDING_NEW': { variant: 'secondary', color: 'text-warning' },
      'NEW': { variant: 'default', color: 'text-success' },
      'PARTIALLY_FILLED': { variant: 'default', color: 'text-primary' },
      'CANCELED': { variant: 'destructive', color: 'text-loss' },
      'EXPIRED': { variant: 'destructive', color: 'text-warning' },
      'REJECTED': { variant: 'destructive', color: 'text-loss' }
    };

    const style = statusMap[statusUpper] || { variant: 'outline' as const, color: '' };

    return (
      <Badge variant={style.variant} className="text-xs">
        {statusUpper.replace('_', ' ')}
      </Badge>
    );
  };

  const renderOrderRow = (order: OrderEntry) => (
    <TableRow key={order.id} className="hover:bg-secondary/20">
      <TableCell className="font-medium">{order.symbol}</TableCell>
      <TableCell>
        <Badge variant={order.side === 'Buy' ? 'default' : 'secondary'}>
          {order.side === 'Buy' ? (
            <><TrendingUp className="w-3 h-3 mr-1" />BUY</>
          ) : (
            <><TrendingDown className="w-3 h-3 mr-1" />SELL</>
          )}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{order.type}</Badge>
      </TableCell>
      <TableCell className="font-mono">
        {order.price ? formatCurrency(order.price) : 'Market'}
      </TableCell>
      <TableCell className="font-mono">
        {formatNumber(order.quantity)}
      </TableCell>
      <TableCell className="font-mono">
        {formatNumber(order.filledQuantity)}
      </TableCell>
      <TableCell className="font-mono">
        {order.avgFillPrice ? formatCurrency(order.avgFillPrice) : '-'}
      </TableCell>
      <TableCell>
        {getStatusBadge(order.status)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatTime(order.lastUpdateNs)}
      </TableCell>
      <TableCell>
        {order.clientId && (
          <Badge variant="outline" className="text-xs font-mono">
            {order.clientId}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {(() => {
          const statusUpper = order.status.toUpperCase();
          const canCancel = statusUpper === 'NEW' ||
                           statusUpper === 'PARTIALLY_FILLED' ||
                           statusUpper === 'ACKNOWLEDGED' ||
                           statusUpper === 'PARTIALLYFILLED';
          return canCancel && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0"
              title="Cancel Order"
            >
              <X className="h-4 w-4" />
            </Button>
          );
        })()}
      </TableCell>
    </TableRow>
  );

  // Show cached data immediately, display connection status in badge
  // Only show full loading screen if there's an error and no cached data
  const hasCachedData = recentFinalOrders.length > 0 || orders.length > 0;

  if (!connected && !hasCachedData && error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Connection Error</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{openOrders.length}</div>
            <p className="text-xs text-muted-foreground">Active Orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{recentFinalOrders.length}</div>
            <p className="text-xs text-muted-foreground">Completed Orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {!connected && !error ? (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting...
                </Badge>
              ) : (
                <Badge variant={connected ? "default" : "destructive"}>
                  {connected ? "Connected" : "Disconnected"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Account State</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            <ClipboardList className="h-4 w-4 mr-2" />
            Active Orders
          </TabsTrigger>
          <TabsTrigger value="completed">
            <History className="h-4 w-4 mr-2" />
            Completed Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Active Orders (Real-time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Filled</TableHead>
                        <TableHead>Avg Fill Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Update</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            No active orders
                          </TableCell>
                        </TableRow>
                      ) : (
                        openOrders.map(renderOrderRow)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Completed Orders (Real-time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Filled</TableHead>
                      <TableHead>Avg Fill Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead>Client ID</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {recentFinalOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No completed orders yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentFinalOrders.map(order => {
                        const isExpanded = expandedOrders.has(order.id);
                        return (
                          <>
                            <TableRow
                              key={order.id}
                              className="cursor-pointer hover:bg-secondary/20"
                              onClick={() => toggleOrderExpanded(order.id)}
                            >
                              <TableCell>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-medium">{order.symbol}</TableCell>
                              <TableCell>
                                <Badge variant={order.side === 'Buy' || order.side === 'BUY' ? 'default' : 'secondary'}>
                                  {(order.side === 'Buy' || order.side === 'BUY') ? (
                                    <><TrendingUp className="w-3 h-3 mr-1" />BUY</>
                                  ) : (
                                    <><TrendingDown className="w-3 h-3 mr-1" />SELL</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{order.type}</Badge>
                              </TableCell>
                              <TableCell className="font-mono">
                                {order.price ? formatCurrency(order.price) : 'Market'}
                              </TableCell>
                              <TableCell className="font-mono">
                                {formatNumber(order.quantity)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {formatNumber(order.filledQuantity)}
                              </TableCell>
                              <TableCell className="font-mono">
                                {order.avgFillPrice ? formatCurrency(order.avgFillPrice) : '-'}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(order.status)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatTime(order.lastUpdateNs)}
                              </TableCell>
                              <TableCell>
                                {order.clientId && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {order.clientId}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && order.stateHistory && order.stateHistory.length > 0 && (
                          <TableRow key={`${order.id}-details`}>
                                <TableCell colSpan={11} className="bg-muted/30 p-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                      <Clock className="h-4 w-4" />
                                      Order Timeline
                                    </div>
                                    <div className="relative pl-8 space-y-4">
                                      {/* Timeline line */}
                                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border"></div>

                                      {order.stateHistory.map((event, idx) => (
                                        <div key={idx} className="relative">
                                          {/* Timeline dot */}
                                          <div className="absolute left-[-1.75rem] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background"></div>

                                          <div className="bg-background rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-4">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  {getStatusBadge(event.status)}
                                                  <Badge variant="outline" className="text-xs">
                                                    {event.messageType}
                                                  </Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                  {event.filledQuantity && (
                                                    <div>Filled: <span className="font-mono">{formatNumber(event.filledQuantity)}</span></div>
                                                  )}
                                                  {event.avgFillPrice && (
                                                    <div>Avg Price: <span className="font-mono">{formatCurrency(event.avgFillPrice)}</span></div>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-xs text-muted-foreground text-right font-mono">
                                                <div>{formatTimeWithMs(event.timestamp)}</div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })
                    )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
