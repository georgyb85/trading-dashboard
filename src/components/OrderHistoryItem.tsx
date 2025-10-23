import { useState } from "react";
import { OrderHistory, OrderStateTransition, OrderFill } from "@/types/account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Clock, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface OrderHistoryItemProps {
  order: OrderHistory;
  defaultExpanded?: boolean;
}

export function OrderHistoryItem({ order, defaultExpanded = false }: OrderHistoryItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formatNumber = (value: string | undefined | null, decimals: number = 8) => {
    if (!value) return '-';
    return parseFloat(value).toFixed(decimals);
  };

  const formatCurrency = (value: string | undefined | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(parseFloat(value));
  };

  const formatTimestamp = (timestamp: string | undefined | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatLatency = (latencyMs?: string) => {
    if (!latencyMs) return '-';
    const ms = parseFloat(latencyMs);
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
    return `${ms.toFixed(3)}ms`;
  };

  const getStatusBadge = (status: string | undefined | null) => {
    if (!status) {
      return (
        <Badge variant="outline" className="text-xs">
          UNKNOWN
        </Badge>
      );
    }

    const statusUpper = status.toUpperCase();
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      'PENDING_NEW': { variant: 'secondary', color: 'text-warning' },
      'NEW': { variant: 'default', color: 'text-primary' },
      'ACKNOWLEDGED': { variant: 'default', color: 'text-success' },
      'PARTIALLY_FILLED': { variant: 'default', color: 'text-primary' },
      'FILLED': { variant: 'outline', color: 'text-success' },
      'CANCELED': { variant: 'destructive', color: 'text-loss' },
      'CANCELLED': { variant: 'destructive', color: 'text-loss' },
      'FAILED': { variant: 'destructive', color: 'text-loss' }
    };

    const style = statusMap[statusUpper] || { variant: 'outline' as const, color: '' };

    return (
      <Badge variant={style.variant} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getSideBadge = (side: string | undefined | null) => {
    if (!side) {
      return (
        <Badge variant="outline">
          UNKNOWN
        </Badge>
      );
    }

    const sideUpper = side.toUpperCase();
    return (
      <Badge variant={sideUpper === 'BUY' || sideUpper === 'LONG' ? 'default' : 'secondary'}>
        {sideUpper === 'BUY' || sideUpper === 'LONG' ? (
          <><TrendingUp className="w-3 h-3 mr-1" />{side}</>
        ) : (
          <><TrendingDown className="w-3 h-3 mr-1" />{side}</>
        )}
      </Badge>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto font-normal"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            <CardTitle className="text-base">
              {order.symbol} - {order.orderId}
            </CardTitle>
          </Button>
          <div className="flex items-center gap-2">
            {getSideBadge(order.side)}
            <Badge variant="outline">{order.type}</Badge>
            {getStatusBadge(order.finalStatus)}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Quantity</p>
            <p className="font-mono">{formatNumber(order.quantity)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Price</p>
            <p className="font-mono">{formatCurrency(order.price)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">First Seen</p>
            <p className="text-xs">{formatTimestamp(order.firstSeen)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Update</p>
            <p className="text-xs">{formatTimestamp(order.lastUpdate)}</p>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* State Transitions */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              State Transitions ({order.stateTransitions.length})
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Filled</TableHead>
                    <TableHead>Avg Fill Price</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.stateTransitions.map((transition: OrderStateTransition, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{getStatusBadge(transition.status)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(transition.quantity)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatCurrency(transition.price)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(transition.filledQuantity)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {parseFloat(transition.avgFillPrice) > 0
                          ? formatCurrency(transition.avgFillPrice)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTimestamp(transition.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatLatency(transition.latencyMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Fills */}
          {order.fills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Fills ({order.fills.length})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fill ID</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Cumulative</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.fills.map((fill: OrderFill) => (
                      <TableRow key={fill.fillId}>
                        <TableCell className="font-mono text-xs">{fill.fillId}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatCurrency(fill.fillPrice)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatNumber(fill.fillQuantity)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatNumber(fill.fillFee)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatNumber(fill.cumulativeFilled)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatTimestamp(fill.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
            {order.clientId && (
              <div>
                <p className="text-muted-foreground text-xs">Client ID</p>
                <p className="font-mono text-xs">{order.clientId}</p>
              </div>
            )}
            {order.created && (
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="text-xs">{formatTimestamp(order.created)}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
