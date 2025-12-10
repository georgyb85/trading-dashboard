import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Target,
  Clock,
  Zap,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { liveModelApi, LiveModel, LivePrediction } from "@/lib/api/endpoints";

// WebSocket URL for live updates
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://agenticresearch.info/ws/live';

interface PredictionChartData {
  time: string;
  prediction: number;
  longThreshold: number;
  shortThreshold: number;
}

export function MLModelMonitor() {
  const [wsConnected, setWsConnected] = useState(false);
  const [latestPrediction, setLatestPrediction] = useState<LivePrediction | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionChartData[]>([]);

  // Fetch models
  const { data: modelsData, isLoading: modelsLoading, refetch: refetchModels } = useQuery({
    queryKey: ['liveModels'],
    queryFn: async () => {
      const response = await liveModelApi.getModels();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch models');
    },
    refetchInterval: 30000, // Refetch every 30s
  });

  const activeModel = modelsData?.models?.[0];

  // Fetch predictions for active model
  const { data: predictionsData, refetch: refetchPredictions } = useQuery({
    queryKey: ['livePredictions', activeModel?.model_id],
    queryFn: async () => {
      if (!activeModel?.model_id) return null;
      const response = await liveModelApi.getPredictions(activeModel.model_id, 50);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch predictions');
    },
    enabled: !!activeModel?.model_id,
    refetchInterval: 60000, // Refetch every minute
  });

  // Update prediction history when data changes
  useEffect(() => {
    if (predictionsData?.predictions) {
      const chartData = predictionsData.predictions
        .slice()
        .reverse()
        .map((p) => ({
          time: new Date(p.ts_ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          prediction: p.prediction,
          longThreshold: p.long_threshold,
          shortThreshold: p.short_threshold,
        }));
      setPredictionHistory(chartData);

      if (predictionsData.predictions.length > 0) {
        setLatestPrediction(predictionsData.predictions[0]);
      }
    }
  }, [predictionsData]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!activeModel?.stream_id) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setWsConnected(true);
        // Subscribe to specific stream
        ws?.send(JSON.stringify({ subscribe: [activeModel.stream_id] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'prediction' && data.modelId === activeModel.model_id) {
            const newPrediction: LivePrediction = {
              ts_ms: data.barEndTs,
              prediction: data.prediction,
              long_threshold: data.longThreshold,
              short_threshold: data.shortThreshold,
              feature_hash: '',
              model_id: data.modelId,
              matched: false,
            };

            setLatestPrediction(newPrediction);

            setPredictionHistory(prev => {
              const newEntry = {
                time: new Date(data.barEndTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                prediction: data.prediction,
                longThreshold: data.longThreshold,
                shortThreshold: data.shortThreshold,
              };
              return [...prev.slice(-49), newEntry];
            });
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Reconnect after 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [activeModel?.stream_id, activeModel?.model_id]);

  const getSignal = useCallback((prediction: number, longThreshold: number, shortThreshold: number) => {
    if (prediction >= longThreshold) return { signal: 'LONG', color: 'text-green-500', icon: TrendingUp };
    if (prediction <= shortThreshold) return { signal: 'SHORT', color: 'text-red-500', icon: TrendingDown };
    return { signal: 'NEUTRAL', color: 'text-gray-500', icon: Minus };
  }, []);

  const formatTimeUntilRetrain = useCallback((nextRetrainMs: number) => {
    const timeUntil = nextRetrainMs - Date.now();
    if (timeUntil <= 0) return 'Imminent';
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, []);

  if (modelsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeModel) {
    return (
      <Card className="trading-card">
        <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
          <Brain className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No active models</p>
          <Button onClick={() => refetchModels()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentSignal = latestPrediction
    ? getSignal(latestPrediction.prediction, latestPrediction.long_threshold, latestPrediction.short_threshold)
    : { signal: 'N/A', color: 'text-gray-500', icon: Minus };

  const SignalIcon = currentSignal.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ML Model Monitor</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {wsConnected ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span className="text-sm text-green-500">Live</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /><span className="text-sm text-red-500">Disconnected</span></>
            )}
          </div>
          <Button onClick={() => { refetchModels(); refetchPredictions(); }} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Model Info Banner */}
      <Card className="trading-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Model ID</p>
              <p className="font-mono text-sm">{activeModel.model_id.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stream</p>
              <p className="font-semibold">{activeModel.stream_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Features</p>
              <p className="font-semibold">{activeModel.feature_count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horizon</p>
              <p className="font-semibold">{activeModel.target_horizon_bars} bars</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trained</p>
              <p className="font-semibold">{new Date(activeModel.trained_at_ms).toLocaleString()}</p>
            </div>
            <Badge variant={activeModel.active ? "default" : "secondary"}>
              {activeModel.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Prediction */}
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Prediction</CardTitle>
            <SignalIcon className={`h-5 w-5 ${currentSignal.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentSignal.color}`}>
              {latestPrediction ? latestPrediction.prediction.toFixed(4) : 'N/A'}
            </div>
            <Badge className={`mt-2 ${currentSignal.color}`} variant="outline">
              {currentSignal.signal}
            </Badge>
            {latestPrediction && (
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(latestPrediction.ts_ms).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Thresholds</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Long</span>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  {activeModel.long_threshold.toFixed(4)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Short</span>
                <Badge variant="outline" className="text-red-500 border-red-500">
                  {activeModel.short_threshold.toFixed(4)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MAE</span>
                <span className="font-mono">{activeModel.mae.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">R²</span>
                <span className="font-mono">{activeModel.r2.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Samples</span>
                <span className="font-mono">{activeModel.sample_count}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Retrain */}
        <Card className="trading-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Retrain</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatTimeUntilRetrain(activeModel.next_retrain_ms)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(activeModel.next_retrain_ms).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prediction History Chart */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Prediction History ({predictionHistory.length} samples)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictionHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={predictionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  domain={['auto', 'auto']}
                />
                {/* Threshold reference lines */}
                {predictionHistory.length > 0 && (
                  <>
                    <ReferenceLine
                      y={predictionHistory[0].longThreshold}
                      stroke="hsl(var(--profit))"
                      strokeDasharray="5 5"
                      label={{ value: 'Long', fill: 'hsl(var(--profit))', fontSize: 10 }}
                    />
                    <ReferenceLine
                      y={predictionHistory[0].shortThreshold}
                      stroke="hsl(var(--loss))"
                      strokeDasharray="5 5"
                      label={{ value: 'Short', fill: 'hsl(var(--loss))', fontSize: 10 }}
                    />
                  </>
                )}
                <Line
                  type="monotone"
                  dataKey="prediction"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No prediction data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* XGBoost Config */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Objective</p>
              <p className="font-mono text-sm">{activeModel.xgb_objective}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Depth</p>
              <p className="font-mono text-sm">{activeModel.xgb_max_depth}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Learning Rate</p>
              <p className="font-mono text-sm">{activeModel.xgb_eta}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rounds</p>
              <p className="font-mono text-sm">{activeModel.xgb_n_rounds}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Train Size</p>
              <p className="font-mono text-sm">{activeModel.train_size} bars</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Feature Hash</p>
              <p className="font-mono text-sm truncate" title={activeModel.feature_hash}>
                {activeModel.feature_hash.slice(0, 8)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
