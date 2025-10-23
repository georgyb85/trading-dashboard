import { OrderHistory } from "@/types/account";
import { OrderHistoryItem } from "@/components/OrderHistoryItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw, Loader2 } from "lucide-react";

interface OrderHistoryListProps {
  orders: OrderHistory[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function OrderHistoryList({ orders, loading, error, onRefresh }: OrderHistoryListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Loading Order History...</h3>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <History className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Error Loading Order History</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Order History
            <Badge variant="outline" className="ml-2">
              {orders.length} orders
            </Badge>
          </CardTitle>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No order history available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <OrderHistoryItem key={order.orderId} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
