import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, WifiOff, Loader2, TrendingUp, Zap, BarChart3, LineChart, Brain } from "lucide-react";
import { useStatusStreamContext } from "@/contexts/StatusStreamContext";
import { useMarketDataContext } from "@/contexts/MarketDataContext";
import { useLiveStreams } from "@/contexts/LiveStreamsContext";
import { useActiveModel } from "@/hooks/useKrakenLive";
import { LiveTimeSeriesChart, LiveHistogramChart } from "@/components/LiveIndicatorCharts";
import { useMemo, useState } from "react";

export function LiveMarketData() {
  const { connected: statusConnected, error: statusError, stats, trades, ohlcv, lastPrices } = useStatusStreamContext();
  const {
    connected: marketDataConnected,
    indicators,
    indicatorNames,
    atr,
    position,
    performance,
    latestIndicator,
    error: marketDataError,
  } = useMarketDataContext();
  const { predictions, targets } = useLiveStreams();
  const { data: activeModel } = useActiveModel();

  const [selectedIndicatorIndex, setSelectedIndicatorIndex] = useState(0);

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

  // Group predictions by model_id
  const predictionsByModel = useMemo(() => {
    const grouped: Record<string, typeof predictions> = {};

    for (const pred of predictions) {
      const modelId = pred.model_id || 'unknown';
      if (!grouped[modelId]) {
        grouped[modelId] = [];
      }
      grouped[modelId].push(pred);
    }
    return grouped;
  }, [predictions]);

  const modelIds = Object.keys(predictionsByModel);

  // Get target horizon from active model metadata
  const targetHorizonBars = activeModel?.target_horizon_bars ?? 0;

  // Build a map of target values from indicators (TGT_* columns) by timestamp
  // Note: Backend sends 0 for unknown targets, so we exclude 0 values for recent timestamps
  // where the target horizon hasn't elapsed yet
  const indicatorTargetsByTimestamp = useMemo(() => {
    const targetMap: Record<number, number | null> = {};
    // Find the index of the TGT_* column
    const tgtIndex = indicatorNames.findIndex(name => name.startsWith('TGT'));
    if (tgtIndex === -1) return targetMap;

    // Use target horizon from model metadata (bars * 1 hour per bar)
    const horizonMs = targetHorizonBars * 60 * 60 * 1000;
    const cutoffTime = Date.now() - horizonMs;

    for (const snapshot of indicators) {
      const tgtValue = snapshot.values[tgtIndex];
      if (tgtValue != null && !isNaN(tgtValue)) {
        // For recent timestamps, treat 0 as "unknown" since backend sends 0 for pending targets
        if (horizonMs > 0 && snapshot.timestamp > cutoffTime && tgtValue === 0) {
          targetMap[snapshot.timestamp] = null;
        } else {
          targetMap[snapshot.timestamp] = tgtValue;
        }
      }
    }
    return targetMap;
  }, [indicators, indicatorNames, targetHorizonBars]);

  // Helper to get actual value - try prediction's actual first, then indicator targets, then WebSocket targets
  // Note: Both predictions and indicators use bar-end timestamps (XX:59:59.999), so we can match directly
  const getActualForPrediction = (modelId: string, ts_ms: number, predActual?: number | null): number | null => {
    // First try the prediction's own actual field (from /ws/predictions with proper null handling)
    if (predActual != null) {
      return predActual;
    }
    // Try indicator targets (both use bar-end timestamps, so direct lookup works)
    const indicatorTarget = indicatorTargetsByTimestamp[ts_ms];
    if (indicatorTarget != null) {
      return indicatorTarget;
    }
    // Finally try WebSocket targets
    const value = targets[`${modelId}:${ts_ms}`] ?? targets[`active:${ts_ms}`];
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

  // Convert bar-end timestamp (XX:59:59.999) to bar-start (XX:00:00) for display
  const formatBarTime = (timestamp: number) => {
    // Round down to the start of the hour
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {indicatorNames.map((name, idx) => (
                        <SelectItem key={`${name}-${idx}`} value={String(idx)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Latest Indicator Values Grid */}
                {latestIndicator && indicatorNames.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {indicatorNames.map((name, idx) => (
                      <div
                        key={`${name}-${idx}`}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          idx === selectedIndicatorIndex
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'bg-muted/30 border border-transparent hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedIndicatorIndex(idx)}
                      >
                        <p className="text-xs text-muted-foreground truncate">{name}</p>
                        <p className="text-sm font-mono font-semibold">
                          {latestIndicator.values[idx]?.toFixed(4) ?? 'N/A'}
                        </p>
                      </div>
                    ))}
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
          {indicatorNames.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <LiveTimeSeriesChart
                data={indicators}
                selectedIndicatorIndex={selectedIndicatorIndex}
                indicatorName={indicatorNames[selectedIndicatorIndex] || `Indicator ${selectedIndicatorIndex}`}
              />
              <LiveHistogramChart
                data={indicators}
                selectedIndicatorIndex={selectedIndicatorIndex}
                indicatorName={indicatorNames[selectedIndicatorIndex] || `Indicator ${selectedIndicatorIndex}`}
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

      {/* Performance Stats */}
      {performance && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trading Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-lg font-semibold">
                  {performance.winRate != null ? ((performance.winRate * 100).toFixed(1) + '%') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`text-lg font-semibold ${(performance.totalPnl ?? 0) >= 0 ? 'text-success' : 'text-loss'}`}>
                  {performance.totalPnl != null ? formatCurrency(performance.totalPnl) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="text-lg font-semibold">{performance.totalTrades ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                <p className="text-lg font-semibold">
                  {performance.sharpeRatio != null ? performance.sharpeRatio.toFixed(2) : 'N/A'}
                </p>
              </div>
            </div>
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
          {predictions.length === 0 ? (
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
                            // Use ROC optimal thresholds for signal determination
                            const longThresh = allThresholds.longOptimal ?? Infinity;
                            const shortThresh = allThresholds.shortOptimal ?? -Infinity;
                            const signal = pred.prediction >= longThresh ? 'LONG' :
                                           pred.prediction <= shortThresh ? 'SHORT' : 'NONE';
                            const actual = getActualForPrediction(modelId, pred.ts_ms, pred.actual);
                            return (
                              <TableRow key={pred.ts_ms}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatBarTime(pred.ts_ms)}
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

      {/* OHLCV Candles - One per symbol */}
      {ohlcv.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Latest Candles (1m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
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
                  {ohlcv.map((candle) => (
                    <TableRow key={candle.symbol}>
                      <TableCell className="font-medium">{candle.symbol}</TableCell>
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
                        {formatNumber(candle.volume, 2)}
                      </TableCell>
                      <TableCell className="font-mono text-primary">
                        {formatCurrency(candle.vwap)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{candle.trades}</Badge>
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
