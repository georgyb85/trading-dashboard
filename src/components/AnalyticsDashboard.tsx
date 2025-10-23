import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  PieChart,
  Activity,
  Target,
  Clock
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from "recharts";

interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturn: number;
}

export function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<'1D' | '7D' | '30D' | '90D'>('7D');

  const performanceMetrics: PerformanceMetrics = {
    totalTrades: 290,
    winRate: 91.0,
    avgWin: 187.42,
    avgLoss: -94.18,
    profitFactor: 2.14,
    sharpeRatio: 0.02,
    maxDrawdown: -12.3,
    totalReturn: 24.7
  };

  // Sample data for charts
  const pnlData = [
    { date: 'Aug 21', pnl: 0, cumulative: 0 },
    { date: 'Aug 24', pnl: 10000, cumulative: 10000 },
    { date: 'Aug 27', pnl: 5000, cumulative: 15000 },
    { date: 'Aug 30', pnl: 15000, cumulative: 30000 },
    { date: 'Sep 2', pnl: 8000, cumulative: 38000 },
    { date: 'Sep 5', pnl: 5000, cumulative: 43000 },
    { date: 'Sep 8', pnl: 2000, cumulative: 45000 },
    { date: 'Sep 11', pnl: 3000, cumulative: 48000 },
    { date: 'Sep 14', pnl: 2000, cumulative: 50000 },
    { date: 'Sep 18', pnl: 0, cumulative: 50000 },
  ];

  const dailyPnlData = [
    { date: 'Aug 21', pnl: 0, fill: 'hsl(var(--muted))' },
    { date: 'Aug 24', pnl: 50000, fill: 'hsl(var(--profit))' },
    { date: 'Aug 27', pnl: 40000, fill: 'hsl(var(--profit))' },
    { date: 'Aug 30', pnl: 60000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 2', pnl: 80000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 5', pnl: 70000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 8', pnl: 90000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 11', pnl: 85000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 14', pnl: 95000, fill: 'hsl(var(--profit))' },
    { date: 'Sep 18', pnl: -30000, fill: 'hsl(var(--loss))' },
  ];

  const winLossData = [
    { type: 'Wins', count: 87, percentage: 68.5 },
    { type: 'Losses', count: 40, percentage: 31.5 }
  ];

  const tradeDurationData = [
    { duration: '<1h', count: 23 },
    { duration: '1-4h', count: 41 },
    { duration: '4-12h', count: 35 },
    { duration: '12-24h', count: 18 },
    { duration: '>24h', count: 10 }
  ];

  const exchangeVolumeData = [
    { name: 'MEXC', value: 45230, percentage: 45.2, color: '#3b82f6', trades: 127 },
    { name: 'Bybit', value: 38750, percentage: 38.8, color: '#10b981', trades: 98 },
    { name: 'Binance', value: 22100, percentage: 22.1, color: '#f59e0b', trades: 65 }
  ];

  const predictionAccuracyData = [
    { prediction: -0.8, actual: -0.75 },
    { prediction: 0.6, actual: 0.65 },
    { prediction: -0.4, actual: -0.35 },
    { prediction: 0.8, actual: 0.72 },
    { prediction: 0.3, actual: 0.28 },
    { prediction: -0.6, actual: -0.58 },
    { prediction: 0.9, actual: 0.85 },
    { prediction: -0.2, actual: -0.18 },
    { prediction: 0.5, actual: 0.48 },
    { prediction: -0.7, actual: -0.65 }
  ];

  const monthlyReturns = [
    { month: 'Oct', returns: 12.4 },
    { month: 'Nov', returns: 18.7 },
    { month: 'Dec', returns: 24.7 },
    { month: 'Jan', returns: 31.2 }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-profit rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">System Online</span>
          </div>
          <div className="flex gap-1">
            {(['1D', '7D', '30D', '90D'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="h-8 px-3"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart3 className="h-4 w-4" />
        Performance Analytics
      </div>

      {/* Performance Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {performanceMetrics.totalTrades}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: 9.7/day
            </p>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-profit">
              {performanceMetrics.winRate.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              91 / 100
            </p>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {performanceMetrics.sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              $106,080.00
            </div>
            <p className="text-xs text-muted-foreground">
              Across 3 exchanges
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="trading" className="gap-2">
            <Activity className="h-4 w-4" />
            Trading Analysis
          </TabsTrigger>
          <TabsTrigger value="model" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Model Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Cumulative P&L and Daily P&L Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cumulative P&L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={pnlData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="trading-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily P&L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyPnlData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Bar 
                      dataKey="pnl" 
                      radius={[2, 2, 0, 0]}
                    >
                      {dailyPnlData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Volume by Exchange and Prediction Accuracy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Volume by Exchange
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={exchangeVolumeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="percentage"
                      >
                        {exchangeVolumeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {exchangeVolumeData.map((exchange) => (
                    <div key={exchange.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: exchange.color }}
                        ></div>
                        <span className="text-sm font-medium">{exchange.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${exchange.value.toLocaleString()}.00</div>
                        <div className="text-xs text-muted-foreground">{exchange.trades} trades</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="trading-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Prediction Accuracy
                </CardTitle>
                <div className="text-xs text-muted-foreground">760148.99</div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart data={predictionAccuracyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <XAxis 
                      dataKey="prediction" 
                      domain={[-1, 1]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Prediction', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      domain={[-1, 1]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Actual', angle: -90, position: 'insideLeft' }}
                    />
                    <Scatter 
                      dataKey="actual" 
                      fill="hsl(var(--profit))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg border border-profit/20 bg-profit/5">
                    <div className="text-2xl font-bold text-profit text-center">91</div>
                    <p className="text-xs text-muted-foreground text-center">Correct Predictions</p>
                  </div>
                  <div className="p-3 rounded-lg border border-loss/20 bg-loss/5">
                    <div className="text-2xl font-bold text-loss text-center">9</div>
                    <p className="text-xs text-muted-foreground text-center">Incorrect Predictions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          {/* Trade Duration Analysis */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Trade Duration Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tradeDurationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="duration" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Exchange Volume & Trade Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Volume by Exchange</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={exchangeVolumeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                    >
                      {exchangeVolumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Volume Share']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Trade Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-profit">
                      {formatCurrency(performanceMetrics.avgWin)}
                    </div>
                    <p className="text-sm text-muted-foreground">Avg Win</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-2xl font-bold text-loss">
                      {formatCurrency(performanceMetrics.avgLoss)}
                    </div>
                    <p className="text-sm text-muted-foreground">Avg Loss</p>
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/10">
                  <div className="text-2xl font-bold text-primary">
                    {performanceMetrics.profitFactor}x
                  </div>
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="model" className="space-y-6">
          {/* Model Prediction vs Actual Results */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                ML Prediction vs Actual Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={predictionAccuracyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="prediction" 
                    domain={[-1, 1]}
                    label={{ value: 'ML Prediction', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    domain={[-1, 1]}
                    label={{ value: 'Actual Result', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [value.toFixed(2), name]}
                  />
                  <Scatter 
                    dataKey="actual" 
                    fill="hsl(var(--primary))"
                  />
                  {/* Perfect prediction line */}
                  <Line 
                    type="linear" 
                    dataKey="prediction" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="text-sm">Model Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">74.2%</div>
                <p className="text-xs text-muted-foreground">Prediction accuracy</p>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="text-sm">Signal Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">71.8%</div>
                <p className="text-xs text-muted-foreground">True positive rate</p>
              </CardContent>
            </Card>

            <Card className="metric-card">
              <CardHeader>
                <CardTitle className="text-sm">Signal Recall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">76.5%</div>
                <p className="text-xs text-muted-foreground">Coverage of opportunities</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detailed Trading Statistics */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Detailed Trading Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">0.01%</div>
              <p className="text-xs text-muted-foreground">Avg Daily Return</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0.62%</div>
              <p className="text-xs text-muted-foreground">Volatility</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">86</div>
              <p className="text-xs text-muted-foreground">Best Day</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">-98</div>
              <p className="text-xs text-muted-foreground">Worst Day</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-muted-foreground">Profitable Days</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">366</div>
              <p className="text-xs text-muted-foreground">Avg Trade Size</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Return</span>
              <span className="font-bold text-profit">$383.09</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-bold text-loss">-0.10%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Profit Factor</span>
              <span className="font-bold">1.04</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Recovery Factor</span>
              <span className="font-bold">38.23</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}