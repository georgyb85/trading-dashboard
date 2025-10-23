import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Position {
  id: string;
  coin: string;
  direction: 'long' | 'short';
  exchange: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  stopLoss: number | null;
  takeProfit: number | null;
  mlPrediction: number;
  entryTimestamp: number;
  status: 'open' | 'closing';
}

interface TradingStats {
  totalPositions: number;
  winRate: number;
  totalPnL: {
    day: number;
    week: number;
    month: number;
  };
  sharpeRatio: number;
  maxDrawdown: number;
  currentExposure: number;
}

export function TradingOverview() {
  const [positions, setPositions] = useState<Position[]>([
    {
      id: '1',
      coin: 'BTCUSDT',
      direction: 'long',
      exchange: 'MEXC',
      entryPrice: 43250.00,
      currentPrice: 43987.50,
      quantity: 0.023,
      pnl: 16.96,
      pnlPercent: 1.71,
      stopLoss: 42180.00,
      takeProfit: 45200.00,
      mlPrediction: 0.73,
      entryTimestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      status: 'open'
    },
    {
      id: '2',
      coin: 'ETHUSDT',
      direction: 'short',
      exchange: 'Bybit',
      entryPrice: 2641.30,
      currentPrice: 2598.75,
      quantity: 0.76,
      pnl: 32.34,
      pnlPercent: 1.61,
      stopLoss: 2720.00,
      takeProfit: 2520.00,
      mlPrediction: -0.68,
      entryTimestamp: Date.now() - 45 * 60 * 1000, // 45 minutes ago
      status: 'open'
    },
    {
      id: '3',
      coin: 'ADAUSDT',
      direction: 'long',
      exchange: 'MEXC',
      entryPrice: 0.4821,
      currentPrice: 0.4736,
      quantity: 2073,
      pnl: -17.62,
      pnlPercent: -1.76,
      stopLoss: 0.4630,
      takeProfit: 0.5050,
      mlPrediction: 0.71,
      entryTimestamp: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
      status: 'open'
    }
  ]);

  const [tradingStats] = useState<TradingStats>({
    totalPositions: 12,
    winRate: 68.5,
    totalPnL: {
      day: 247.83,
      week: 1863.21,
      month: 7249.56
    },
    sharpeRatio: 2.14,
    maxDrawdown: -12.3,
    currentExposure: 8947.62
  });

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => prev.map(position => {
        const priceChange = (Math.random() - 0.5) * position.currentPrice * 0.002; // 0.2% max change
        const newPrice = Math.max(0, position.currentPrice + priceChange);
        const pnl = position.direction === 'long' 
          ? (newPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - newPrice) * position.quantity;
        const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;

        return {
          ...position,
          currentPrice: newPrice,
          pnl,
          pnlPercent
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (timestamp: number) => {
    const duration = Date.now() - timestamp;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'long' ? (
      <ArrowUpRight className="h-4 w-4 text-trading-long" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-trading-short" />
    );
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'profit-text' : 'loss-text';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Overview</h1>
        <Badge variant="outline" className="gap-2">
          <Target className="h-4 w-4" />
          {positions.filter(p => p.status === 'open').length} Active Positions
        </Badge>
      </div>

      {/* Trading Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPnLColor(tradingStats.totalPnL.day)}`}>
              {formatCurrency(tradingStats.totalPnL.day)}
            </div>
            <p className="text-xs text-muted-foreground">
              Week: {formatCurrency(tradingStats.totalPnL.week)}
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {tradingStats.winRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {tradingStats.totalPositions} total positions
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {tradingStats.sharpeRatio}
            </div>
            <p className="text-xs text-muted-foreground">
              Max DD: {tradingStats.maxDrawdown}%
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(tradingStats.currentExposure)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Positions Table */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>P&L %</TableHead>
                    <TableHead>ML Signal</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id} className="hover:bg-secondary/20">
                      <TableCell className="font-medium">{position.coin}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(position.direction)}
                          <span
                            className={`font-medium ${
                              position.direction === "long" ? "text-trading-long" : "text-trading-short"
                            }`}
                          >
                            {position.direction.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {position.exchange}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        ${position.entryPrice.toFixed(position.coin.includes("USD") ? 2 : 4)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        ${position.currentPrice.toFixed(position.coin.includes("USD") ? 2 : 4)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {position.quantity.toFixed(3)}
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${getPnLColor(position.pnl)}`}>
                        {formatCurrency(position.pnl)}
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${getPnLColor(position.pnlPercent)}`}>
                        {position.pnlPercent >= 0 ? "+" : ""}
                        {position.pnlPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            position.mlPrediction >= 0.65
                              ? "text-trading-long border-trading-long"
                              : position.mlPrediction <= -0.65
                              ? "text-trading-short border-trading-short"
                              : "text-trading-neutral border-trading-neutral"
                          }`}
                        >
                          {position.mlPrediction >= 0 ? "+" : ""}
                          {position.mlPrediction.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {formatDuration(position.entryTimestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.status === "open" ? "default" : "secondary"} className="text-xs">
                          {position.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
