import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Gauge,
  RefreshCw,
  BarChart3,
  Clock,
  Zap,
  Activity
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

interface MLPrediction {
  value: number;
  timestamp: number;
  confidence: number;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  lastRetrainTime: number;
  nextRetrainTime: number;
  featuresCount: number;
}

export function MLModelMonitor() {
  const [currentPrediction, setCurrentPrediction] = useState<MLPrediction>({
    value: 0.73,
    timestamp: Date.now(),
    confidence: 0.89
  });

  const [predictionHistory, setPredictionHistory] = useState<number[]>([
    0.45, 0.52, 0.61, 0.58, 0.67, 0.71, 0.69, 0.74, 0.78, 0.73
  ]);

  const [thresholds] = useState({
    long: 0.65,
    short: -0.65,
    mode: "OptimalROC"
  });

  const [modelPerformance] = useState<ModelPerformance>({
    accuracy: 74.2,
    precision: 71.8,
    recall: 76.5,
    lastRetrainTime: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    nextRetrainTime: Date.now() + 20 * 60 * 60 * 1000, // 20 hours from now
    featuresCount: 47
  });

  const [featureImportance] = useState([
    { name: "RSI_14", importance: 0.23 },
    { name: "MACD_Signal", importance: 0.18 },
    { name: "Volume_SMA", importance: 0.15 },
    { name: "Bollinger_Position", importance: 0.12 },
    { name: "ATR_Normalized", importance: 0.11 },
    { name: "Price_Momentum", importance: 0.10 },
    { name: "Volatility_Ratio", importance: 0.08 },
    { name: "Order_Flow", importance: 0.03 }
  ]);

  // Simulate real-time prediction updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newValue = Math.max(-1, Math.min(1, currentPrediction.value + (Math.random() - 0.5) * 0.2));
      const newConfidence = Math.max(0.5, Math.min(1, 0.8 + (Math.random() - 0.5) * 0.3));
      
      setCurrentPrediction({
        value: newValue,
        timestamp: Date.now(),
        confidence: newConfidence
      });

      setPredictionHistory(prev => [...prev.slice(1), newValue]);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentPrediction.value]);

  const getPredictionSignal = (value: number) => {
    if (value >= thresholds.long) return { signal: "LONG", color: "text-trading-long", bgColor: "bg-trading-long/10" };
    if (value <= thresholds.short) return { signal: "SHORT", color: "text-trading-short", bgColor: "bg-trading-short/10" };
    return { signal: "NEUTRAL", color: "text-trading-neutral", bgColor: "bg-muted" };
  };

  const signal = getPredictionSignal(currentPrediction.value);
  
  const formatTimeUntilRetrain = () => {
    const timeUntil = modelPerformance.nextRetrainTime - Date.now();
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Generate line chart data
  const predictionChartData = predictionHistory.map((value, index) => ({
    time: index + 1,
    prediction: value
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ML Model Monitor</h1>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-profit rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">System Online</span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Prediction</CardTitle>
            <Target className="h-4 w-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-profit">
              {currentPrediction.value.toFixed(3)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Long Threshold</span>
              <Badge variant="outline" className="text-profit border-profit text-xs">
                +{thresholds.long.toFixed(2)}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Short Threshold</span>
              <Badge variant="outline" className="text-loss border-loss text-xs">
                {thresholds.short.toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {modelPerformance.accuracy.toFixed(2)}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-warning h-2 rounded-full transition-all duration-500" 
                style={{ width: `${modelPerformance.accuracy}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signal Strength</CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(currentPrediction.confidence * 100).toFixed(0)}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-500" 
                style={{ width: `${currentPrediction.confidence * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Retrain</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatTimeUntilRetrain()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last: {new Date(modelPerformance.lastRetrainTime).toLocaleString().split(',')[1].trim()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction History Chart */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Prediction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[-1, 1]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              {/* Threshold lines */}
              <Line 
                type="monotone" 
                dataKey={() => thresholds.short} 
                stroke="hsl(var(--loss))" 
                strokeDasharray="5 5" 
                dot={false}
                strokeWidth={1}
              />
              <Line 
                type="monotone" 
                dataKey={() => thresholds.long} 
                stroke="hsl(var(--profit))" 
                strokeDasharray="5 5" 
                dot={false}
                strokeWidth={1}
              />
              <Line 
                type="monotone" 
                dataKey="prediction" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom Section: Feature Importance & Model Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Feature Importance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart 
                data={featureImportance} 
                layout="horizontal"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis 
                  type="number" 
                  domain={[0, 0.25]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={75}
                />
                <Bar 
                  dataKey="importance" 
                  fill="hsl(var(--primary))"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Status */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle>Model Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Threshold Mode</span>
                <Badge variant="secondary">OptimalROC</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Model Type</span>
                <Badge variant="secondary">XGBoost</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Training Data</span>
                <span className="text-sm">Last 10,000 samples</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Feature Count</span>
                <span className="text-sm">{modelPerformance.featuresCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="p-4 rounded-lg border border-profit/20 bg-profit/5">
                <div className="text-2xl font-bold text-profit text-center">
                  46
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">Long Signals</p>
              </div>
              <div className="p-4 rounded-lg border border-loss/20 bg-loss/5">
                <div className="text-2xl font-bold text-loss text-center">
                  27
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">Short Signals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}