import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, WifiOff, Loader2, TrendingUp, Zap, BarChart3, LineChart, Brain } from "lucide-react";
import { useStatusStreamContext } from "@/contexts/StatusStreamContext";
import { useMarketDataContext, PredictionData } from "@/contexts/MarketDataContext";
import { useActiveModel } from "@/hooks/useKrakenLive";
import { LiveTimeSeriesChart, LiveHistogramChart } from "@/components/LiveIndicatorCharts";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { krakenClient } from "@/lib/kraken/client";

// Derive bar duration from streamId suffix (e.g., btcusdt_1h → 1h in ms)
const getBarDurationMs = (streamId?: string): number | null => {
  if (!streamId) return null;
  const match = streamId.match(/_(\d+)([smhd])/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return unitMs[unit] ? amount * unitMs[unit] : null;
};

export function LiveMarketData() {
  // Status stream (/ws/status): trades, stats, lastPrices
  const { connected: statusConnected, error: statusError, stats, trades, lastPrices } = useStatusStreamContext();
  // Market data stream (/ws/live): indicators, predictions, ohlcv bars
  const {
    connected: marketDataConnected,
    indicators,
    indicatorNames,
    allColumnNames,  // Features + Targets (includes TGT_*)
    atr,
    position,
    performance,
    latestIndicator,
    error: marketDataError,
    predictions,
    targets,
    signals,
    ohlcv,
  } = useMarketDataContext();
  const { data: activeModel } = useActiveModel();

  const [selectedIndicatorIndex, setSelectedIndicatorIndex] = useState(0);

  // Fetch predictions with correct actual values from REST API (calculated from OHLCV)
  const activeModelId = activeModel?.model_id;
  const predictionsApiQuery = useQuery({
    queryKey: ['kraken', 'predictions', activeModelId],
    enabled: !!activeModelId,
    queryFn: async () => {
      const resp = await krakenClient.getPredictions(activeModelId!, 100);
      if (!resp.success || !resp.data) return [];
      return resp.data.predictions;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,  // Refresh every minute to get updated actuals
  });

  // Bar duration derived from streamId (e.g., btcusdt_1h)
  const barDurationMs = useMemo(() => getBarDurationMs(activeModel?.stream_id), [activeModel?.stream_id]);

  // Target column name from active model training metadata
  const targetColumnName = activeModel?.train_result?.target_column;

  // Build map of actual values from REST API (these are calculated correctly from OHLCV)
  const apiActualsByTimestamp = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of predictionsApiQuery.data ?? []) {
      if (p.actual != null) {
        map.set(p.ts_ms, p.actual);
      }
    }
    return map;
  }, [predictionsApiQuery.data]);

  // Get all 4 thresholds from active model's train_result
  const allThresholds = useMemo(() => {
    const thresholds = activeModel?.train_result?.thresholds;
    return {
      longOptimal: thresholds?.long_optimal ?? null,
      longPercentile95: thresholds?.long_percentile_95 ?? null,
      shortOptimal: thresholds?.short_optimal ?? null,
      shortPercentile05: thresholds?.short_percentile_05 ?? null,
    };
  }, [activeModel]);

  // Combine REST API predictions with WebSocket predictions
  // REST API provides historical predictions (persisted), WebSocket provides real-time updates
  const combinedPredictions = useMemo(() => {
    const predMap = new Map<number, PredictionData>();

    // Add REST API predictions first (these include actual values calculated from OHLCV)
    for (const p of predictionsApiQuery.data ?? []) {
      predMap.set(p.ts_ms, {
        ts: p.ts_ms,
        modelId: p.model_id ?? activeModelId ?? 'unknown',
        streamId: activeModel?.stream_id ?? 'unknown',
        prediction: p.prediction,
        longThreshold: p.long_threshold,
        shortThreshold: p.short_threshold,
        signal: p.prediction >= p.long_threshold ? 'long' : p.prediction <= p.short_threshold ? 'short' : 'flat',
      });
    }

    // Add WebSocket predictions (may be more recent, don't overwrite REST API)
    for (const pred of predictions) {
      if (!predMap.has(pred.ts)) {
        predMap.set(pred.ts, pred);
      }
    }

    return Array.from(predMap.values()).sort((a, b) => b.ts - a.ts);
  }, [predictions, predictionsApiQuery.data, activeModelId, activeModel?.stream_id]);

  // Group combined predictions by model_id
  const predictionsByModel = useMemo(() => {
    const grouped: Record<string, PredictionData[]> = {};

    for (const pred of combinedPredictions) {
      const modelId = pred.modelId || 'unknown';
      if (!grouped[modelId]) {
        grouped[modelId] = [];
      }
      grouped[modelId].push(pred);
    }
    return grouped;
  }, [combinedPredictions]);

  const modelIds = Object.keys(predictionsByModel);

  // Map of matured target values from /ws/live WebSocket events
  // Target values are calculated from OHLCV: close[T+horizon] - close[T]
  // This is the single source of truth for live target values (indicator TGT_* columns are not stored)
  const maturedTargetsByStreamTs = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of targets) {
      const key = `${t.streamId}:${t.originTs}`;
      map.set(key, t.value);
    }
    return map;
  }, [targets]);

  // Map target actuals from indicator snapshots using shift semantics
  // snapshotTs + (shift * barDurationMs) = origin bar timestamp for the prediction
  const targetActualsByStreamTs = useMemo(() => {
    const map = new Map<string, number>();
    if (!targetColumnName || !barDurationMs) return map;

    for (const snap of indicators) {
      const streamId = snap.streamId ?? 'unknown';
      if (!snap.columns || snap.columns.length === 0) continue;

      const colIdx = snap.columns.indexOf(targetColumnName);
      if (colIdx < 0) continue;
      if (colIdx >= snap.values.length || colIdx >= snap.shifts.length) continue;

      const value = snap.values[colIdx];
      if (value == null || Number.isNaN(value)) continue;

      const shift = snap.shifts[colIdx];
      if (typeof shift !== 'number' || shift >= 0) continue;  // target columns use negative shift

      const originTs = snap.timestamp + shift * barDurationMs;
      map.set(`${streamId}:${originTs}`, value as number);
    }
    return map;
  }, [barDurationMs, indicators, targetColumnName]);

  // Helper to get actual value - prefer REST API actuals (calculated from OHLCV: close[T+horizon] - close[T])
  const getActualForPrediction = (modelId: string, streamId: string | undefined, ts_ms: number): number | null => {
    // First try the REST API actual (correctly calculated from OHLCV data)
    const apiActual = apiActualsByTimestamp.get(ts_ms);
    if (apiActual != null) {
      return apiActual;
    }
    // Next try indicator-derived target actuals (from snapshot shift semantics)
    const indicatorActual = targetActualsByStreamTs.get(`${streamId ?? 'unknown'}:${ts_ms}`);
    if (indicatorActual != null) {
      return indicatorActual;
    }
    // Fall back to matured targets from /ws/live WebSocket events
    const value =
      maturedTargetsByStreamTs.get(`${streamId ?? 'unknown'}:${ts_ms}`) ??
      maturedTargetsByStreamTs.get(`active:${ts_ms}`);
    return value ?? null;
  };

  // Get top symbols by activity - filter out invalid prices
  const topSymbols = useMemo(() => {
    return Object.entries(lastPrices)
      .filter(([, price]) => typeof price === 'number' && !isNaN(price) && isFinite(price))
      .sort(([, priceA], [, priceB]) => priceB - priceA)
      .slice(0, 10);
  }, [lastPrices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Display actual timestamp - no rounding/faking
  // If timestamps appear misaligned (e.g., XX:47:59 instead of XX:00:00),
  // that's a backend bug that needs fixing, not masking in frontend
  const formatBarTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Only show loading on initial load when we have no data at all
  const hasAnyData = indicators.length > 0 || Object.keys(lastPrices).length > 0 || trades.length > 0;

  if (!statusConnected && !hasAnyData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            {statusError ? (
              <div className="space-y-4">
                <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Connection Error</h3>
                  <p className="text-sm text-muted-foreground">{statusError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Connecting to Status Stream...</h3>
                  <p className="text-sm text-muted-foreground">Please wait</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Object.keys(lastPrices).length}</div>
            <p className="text-xs text-muted-foreground">Active Symbols</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {stats?.message_rates?.trade_messages?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Trade Msgs/sec</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {indicators.length}
            </div>
            <p className="text-xs text-muted-foreground">Indicator Snapshots</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">
              {signals.length}
            </div>
            <p className="text-xs text-muted-foreground">Active Signals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant={statusConnected ? "default" : "destructive"}>
                Status: {statusConnected ? "OK" : "OFF"}
              </Badge>
              <Badge variant={marketDataConnected ? "default" : "secondary"}>
                Indicators: {marketDataConnected ? "OK" : "OFF"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">WebSocket Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Indicators Section */}
      {indicators.length > 0 && (
        <>
          {/* Indicator Selector & Latest Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Live Indicators (BTC/USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Select Indicator:
                  </label>
                  <Select
                    value={String(selectedIndicatorIndex)}
                    onValueChange={(val) => setSelectedIndicatorIndex(parseInt(val))}
                  >
                    <SelectTrigger className="w-[280px] bg-card border-border">
                      <SelectValue placeholder="Select indicator" />
                    </SelectTrigger>
                    <SelectContent>
                      {allColumnNames.map((name, idx) => (
                        <SelectItem key={`${name}-${idx}`} value={String(idx)}>
                          {name.startsWith('TGT_') ? `📊 ${name}` : name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Latest Indicator Values Grid */}
                {latestIndicator && allColumnNames.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {allColumnNames.map((name, idx) => {
                      const isTarget = name.startsWith('TGT_');
                      return (
                        <div
                          key={`${name}-${idx}`}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            idx === selectedIndicatorIndex
                              ? 'bg-primary/10 border-2 border-primary'
                              : isTarget
                                ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedIndicatorIndex(idx)}
                        >
                          <p className={`text-xs truncate ${isTarget ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {isTarget ? `📊 ${name}` : name}
                          </p>
                          <p className="text-sm font-mono font-semibold">
                            {latestIndicator.values[idx]?.toFixed(4) ?? 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Last update time */}
                {latestIndicator && (
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatDateTime(latestIndicator.timestamp)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          {allColumnNames.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <LiveTimeSeriesChart
                data={indicators}
                selectedIndicatorIndex={selectedIndicatorIndex}
                indicatorName={allColumnNames[selectedIndicatorIndex] || `Indicator ${selectedIndicatorIndex}`}
              />
              <LiveHistogramChart
                data={indicators}
                selectedIndicatorIndex={selectedIndicatorIndex}
                indicatorName={allColumnNames[selectedIndicatorIndex] || `Indicator ${selectedIndicatorIndex}`}
              />
            </div>
          )}
        </>
      )}

      {/* Market Data Connection Status (if not connected and no data) */}
      {!marketDataConnected && indicators.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Live Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <div className="space-y-3">
              {marketDataError ? (
                <>
                  <WifiOff className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Indicator Stream Unavailable
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The live indicator service (port 6006) is not running.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Will automatically reconnect when available.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Connecting to indicator stream...
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ATR & Position Info */}
      {(atr || position) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {atr && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ATR & Risk Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">ATR</p>
                    <p className="font-mono font-semibold">{atr.value?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stop Loss</p>
                    <p className="font-mono text-loss">{atr.stopLossLevel?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Take Profit</p>
                    <p className="font-mono text-success">{atr.takeProfitLevel?.toFixed(2) ?? 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {position && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Position</CardTitle>
              </CardHeader>
              <CardContent>
                {position.hasPosition ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Side</p>
                      <Badge variant={position.side === 'long' ? 'default' : 'secondary'}>
                        {position.side?.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="font-mono">{formatCurrency(position.entryPrice || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                      <p className={`font-mono ${(position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-loss'}`}>
                        {formatCurrency(position.unrealizedPnl || 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active position</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance Stats - displays real-time metrics from backend via WebSocket */}
      {performance && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Live Model Performance</CardTitle>
              {performance.lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Updated: {formatDateTime(performance.lastUpdate)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Directional Accuracy</p>
                <p className="text-lg font-semibold text-primary">
                  {performance.directionalAccuracy != null
                    ? ((performance.directionalAccuracy * 100).toFixed(1) + '%')
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROC AUC</p>
                <p className="text-lg font-semibold text-primary">
                  {performance.rocAuc != null && performance.rocAuc >= 0 && Number.isFinite(performance.rocAuc)
                    ? performance.rocAuc.toFixed(3)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">MAE</p>
                <p className="text-lg font-semibold">
                  {performance.mae != null ? performance.mae.toFixed(4) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sample Count</p>
                <p className="text-lg font-semibold">{performance.samples ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">True Pos / False Pos</p>
                <p className="text-lg font-mono">
                  <span className="text-success">{performance.truePositives ?? 0}</span>
                  {' / '}
                  <span className="text-loss">{performance.falsePositives ?? 0}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">True Neg / False Neg</p>
                <p className="text-lg font-mono">
                  <span className="text-success">{performance.trueNegatives ?? 0}</span>
                  {' / '}
                  <span className="text-loss">{performance.falseNegatives ?? 0}</span>
                </p>
              </div>
            </div>
            {performance.modelId && (
              <p className="text-xs text-muted-foreground mt-3">
                Model: <span className="font-mono">{performance.modelId}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Live Predictions
            {predictions.length > 0 && (
              <Badge variant="secondary" className="ml-2">{predictions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {combinedPredictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No predictions available</p>
              <p className="text-xs mt-1">Predictions will appear when the model generates them</p>
            </div>
          ) : (
            <Tabs defaultValue={modelIds[0]} className="w-full">
              <TabsList className="mb-4">
                {modelIds.map((modelId) => (
                  <TabsTrigger key={modelId} value={modelId} className="font-mono text-xs">
                    {modelId}
                  </TabsTrigger>
                ))}
              </TabsList>
              {modelIds.map((modelId) => (
                  <TabsContent key={modelId} value={modelId}>
                    {/* Thresholds Legend - All 4 thresholds */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Long (ROC Optimal)</span>
                        <div className="font-mono text-success font-semibold">
                          {allThresholds.longOptimal?.toFixed(2) ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Long (95th Percentile)</span>
                        <div className="font-mono text-success/70 font-semibold">
                          {allThresholds.longPercentile95?.toFixed(2) ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Short (ROC Optimal)</span>
                        <div className="font-mono text-loss font-semibold">
                          {allThresholds.shortOptimal?.toFixed(2) ?? 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Short (5th Percentile)</span>
                        <div className="font-mono text-loss/70 font-semibold">
                          {allThresholds.shortPercentile05?.toFixed(2) ?? 'N/A'}
                        </div>
                      </div>
                    </div>
                    {/* Predictions Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Prediction</TableHead>
                            <TableHead>Signal</TableHead>
                            <TableHead>Actual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {predictionsByModel[modelId].slice(0, 30).map((pred) => {
                            const longThresh = pred.longThreshold ?? allThresholds.longOptimal ?? Infinity;
                            const shortThresh = pred.shortThreshold ?? allThresholds.shortOptimal ?? -Infinity;
                            const signal = pred.prediction >= longThresh ? 'LONG' :
                                           pred.prediction <= shortThresh ? 'SHORT' : 'NONE';
                            const actual = getActualForPrediction(modelId, pred.streamId, pred.ts);
                            return (
                              <TableRow key={pred.ts}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatBarTime(pred.ts)}
                                </TableCell>
                                <TableCell className="font-mono font-semibold">
                                  {pred.prediction.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={signal === 'LONG' ? 'default' : signal === 'SHORT' ? 'destructive' : 'secondary'}>
                                    {signal}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono">
                                  {actual != null ? actual.toFixed(2) : '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Live Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Last Price</TableHead>
                  <TableHead>Exchange</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSymbols.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No price data available
                    </TableCell>
                  </TableRow>
                ) : (
                  topSymbols.map(([symbol, price]) => (
                    <TableRow key={symbol}>
                      <TableCell className="font-medium">{symbol}</TableCell>
                      <TableCell className="font-mono text-success text-lg">
                        {formatCurrency(price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Bybit</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.slice(-20).reverse().map((trade, idx) => (
                    <TableRow key={`${trade.symbol}-${trade.timestamp}-${idx}`}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(trade.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.side === 'Buy' ? 'default' : 'secondary'}>
                          {trade.side === 'Buy' ? (
                            <><TrendingUp className="w-3 h-3 mr-1" />BUY</>
                          ) : (
                            <>SELL</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(trade.price)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(trade.volume, 4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OHLCV Candles from /ws/live - Latest bar per stream */}
      {ohlcv.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Latest Candles (per Stream)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stream</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>High</TableHead>
                    <TableHead>Low</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>VWAP</TableHead>
                    <TableHead>Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show only the latest bar per stream */}
                  {Array.from(
                    ohlcv.reduce((map, candle) => {
                      const existing = map.get(candle.streamId);
                      if (!existing || candle.timestamp > existing.timestamp) {
                        map.set(candle.streamId, candle);
                      }
                      return map;
                    }, new Map<string, typeof ohlcv[0]>()).values()
                  ).map((candle) => (
                    <TableRow key={candle.streamId}>
                      <TableCell className="font-medium">{candle.symbol || candle.streamId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(candle.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(candle.open)}
                      </TableCell>
                      <TableCell className="font-mono text-success">
                        {formatCurrency(candle.high)}
                      </TableCell>
                      <TableCell className="font-mono text-loss">
                        {formatCurrency(candle.low)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {formatCurrency(candle.close)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(candle.volume, 4)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {candle.vwap != null ? formatCurrency(candle.vwap) : '—'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {candle.tradeCount ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Stats */}
      {stats && stats.thread_statuses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Thread Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.thread_statuses.map((thread, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{thread.name}</p>
                    {thread.processingRate && (
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(thread.processingRate)} msg/s
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      thread.status === 'healthy' ? 'default' :
                      thread.status === 'warning' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {thread.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
