import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WifiOff, Loader2, ChevronLeft, ChevronRight, Wifi, RefreshCw } from "lucide-react";
import { config } from "@/lib/config";

// Stage1 Position record from the API
interface Stage1Position {
  position_id: string;
  trader_id: string;
  model_id: string;
  stream_id: string;
  symbol: string;
  exchange: string;
  side: string;
  entry_price: number;
  quantity: number;
  stop_loss?: number;
  take_profit?: number;
  entry_cl_ord_id: string;
  entry_timestamp_ms: number;
  entry_signal_strength: number;
  bars_held: number;
  exit_pending: boolean;
  exit_cl_ord_id?: string;
  exit_reason?: string;
  exit_requested_at_ms?: number;
  exit_filled_qty?: number;
  exit_filled_notional?: number;
  realized_pnl?: number;
  realized_fees?: number;
  correlation_id?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
}

// Mini sparkline component for metrics
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-16 h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

// Mini bar chart for win rate
function WinRateBars({ winRate }: { winRate: number }) {
  const bars = 7;
  const filledBars = Math.round((winRate / 100) * bars);

  return (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm ${i < filledBars ? 'bg-green-500' : 'bg-muted'}`}
          style={{ height: `${(i + 1) * 12}%` }}
        />
      ))}
    </div>
  );
}

// Display position type for UI
interface DisplayPosition {
  id: string;
  modelId: string;
  streamId: string;
  symbol: string;
  exchange: string;
  side: string;
  entryPrice: number;
  qty: string;
  unrealizedPnl: number;
  slTpLevels: string;
  barsHeld: number;
  cooldownState: string;
}

interface DisplayHistoryPosition {
  id: string;
  modelId: string;
  streamId: string;
  symbol: string;
  exchange: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  qty: string;
  realizedPnl: number;
  dwellTime: string;
  exitDate: string;
  exitReason: string;
}

const forceCloseReasons = [
  "manual_close",
  "risk_limit",
  "debug_test",
  "reconciliation",
];

export function PositionsTable() {
  const { positions, connected: accountConnected, error: accountError } = useAccountStateContext();
  const { connected: wsConnected } = useStatusStreamContext();

  const [activeTab, setActiveTab] = useState("active");
  const [triggerBracketCheck, setTriggerBracketCheck] = useState(false);
  const [forceCloseDialogOpen, setForceCloseDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<DisplayPosition | null>(null);
  const [selectedReason, setSelectedReason] = useState("manual_close");
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 20;

  // Stage1 positions state
  const [stage1ActivePositions, setStage1ActivePositions] = useState<Stage1Position[]>([]);
  const [stage1HistoryPositions, setStage1HistoryPositions] = useState<Stage1Position[]>([]);
  const [stage1Loading, setStage1Loading] = useState(true);
  const [stage1Error, setStage1Error] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const accountWsPath = config.krakenAccountWsPath;
  const stage1PositionsPath = `/api/positions`;
  const stage1ActivePositionsPath = `/api/positions/active`;

  // Fetch positions from Stage1 API
  const fetchStage1Positions = useCallback(async () => {
    setStage1Loading(true);
    setStage1Error(null);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (config.stage1ApiToken) {
      headers['X-Stage1-Token'] = config.stage1ApiToken;
    }

    try {
      // Fetch active positions
      const activeResponse = await fetch(
        `${config.stage1ApiBaseUrl}${stage1ActivePositionsPath}?trader_id=${config.traderId}`,
        { headers }
      );
      if (!activeResponse.ok) {
        throw new Error(`Failed to fetch active positions: ${activeResponse.status}`);
      }
      const activeData = await activeResponse.json();
      const activePositions = activeData.positions || activeData || [];
      setStage1ActivePositions(Array.isArray(activePositions) ? activePositions : []);

      // Fetch closed positions (history)
      const historyResponse = await fetch(
        `${config.stage1ApiBaseUrl}${stage1PositionsPath}?trader_id=${config.traderId}&active=false&limit=100`,
        { headers }
      );
      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch position history: ${historyResponse.status}`);
      }
      const historyData = await historyResponse.json();
      const historyPositions = historyData.positions || historyData || [];
      setStage1HistoryPositions(Array.isArray(historyPositions) ? historyPositions : []);

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching Stage1 positions:', err);
      setStage1Error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStage1Loading(false);
    }
  }, []);

  // Fetch positions on mount and every 30 seconds
  useEffect(() => {
    fetchStage1Positions();
    const interval = setInterval(fetchStage1Positions, 30000);
    return () => clearInterval(interval);
  }, [fetchStage1Positions]);

  // Metrics data (would come from API in real implementation)
  const metrics = {
    rollingSharpe: 1.25,
    sharpeHistory: [1.1, 1.15, 1.2, 1.18, 1.22, 1.25],
    maxDrawdown: -15.2,
    drawdownHistory: [-10, -12, -15.2, -14, -13, -15.2],
    winRate: 58,
    profitFactor: 1.45,
    timeWeightedReturn: 8.5,
    moneyWeightedReturn: 9.2,
  };

  // Format SL/TP levels
  const formatSlTp = (pos: Stage1Position): string => {
    const sl = pos.stop_loss ? `$${pos.stop_loss.toFixed(2)}` : '-';
    const tp = pos.take_profit ? `$${pos.take_profit.toFixed(2)}` : '-';
    return `SL:${sl} / TP:${tp}`;
  };

  // Format timestamp to readable date
  const formatTimestamp = (ms: number): string => {
    if (!ms) return '-';
    return new Date(ms).toLocaleString();
  };

  // Calculate dwell time from entry to close
  const formatDwellTime = (entryMs: number, closeMs?: number): string => {
    const end = closeMs || Date.now();
    const durationMs = end - entryMs;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Map Stage1 positions to display format
  const displayPositions: DisplayPosition[] = useMemo(() => {
    return stage1ActivePositions.map(pos => ({
      id: pos.position_id,
      modelId: pos.model_id,
      streamId: pos.stream_id,
      symbol: pos.symbol,
      exchange: pos.exchange,
      side: pos.side,
      entryPrice: pos.entry_price,
      qty: `${pos.quantity.toFixed(6)} ${pos.symbol.split(/[-_]/)[0]}`,
      unrealizedPnl: 0, // Would need current price to calculate
      slTpLevels: formatSlTp(pos),
      barsHeld: pos.bars_held,
      cooldownState: pos.exit_pending ? "Exit Pending" : "Active",
    }));
  }, [stage1ActivePositions]);

  // Map Stage1 history positions to display format
  const displayHistoryPositions: DisplayHistoryPosition[] = useMemo(() => {
    return stage1HistoryPositions.map(pos => ({
      id: pos.position_id,
      modelId: pos.model_id,
      streamId: pos.stream_id,
      symbol: pos.symbol,
      exchange: pos.exchange,
      side: pos.side,
      entryPrice: pos.entry_price,
      exitPrice: pos.exit_filled_notional && pos.exit_filled_qty
        ? pos.exit_filled_notional / pos.exit_filled_qty
        : 0,
      qty: `${pos.quantity.toFixed(6)} ${pos.symbol.split(/[-_]/)[0]}`,
      realizedPnl: pos.realized_pnl || 0,
      dwellTime: formatDwellTime(pos.entry_timestamp_ms, pos.closed_at ? new Date(pos.closed_at).getTime() : undefined),
      exitDate: pos.closed_at ? new Date(pos.closed_at).toLocaleString() : '-',
      exitReason: pos.exit_reason || '-',
    }));
  }, [stage1HistoryPositions]);

  // Paginated history positions
  const paginatedHistoryPositions = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return displayHistoryPositions.slice(start, start + historyPageSize);
  }, [displayHistoryPositions, historyPage]);

  const totalHistoryPages = Math.ceil(displayHistoryPositions.length / historyPageSize);

  const handleForceClose = (position: DisplayPosition) => {
    setSelectedPosition(position);
    setForceCloseDialogOpen(true);
  };

  const handleConfirmForceClose = () => {
    setForceCloseDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const executeForceClose = () => {
    // Execute the force close - would call API in real implementation
    console.log("Force closing position:", selectedPosition?.id, "Reason:", selectedReason);
    setConfirmDialogOpen(false);
    setSelectedPosition(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Loading state (only show if Stage1 is loading AND no data yet)
  if (stage1Loading && stage1ActivePositions.length === 0 && stage1HistoryPositions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Loading positions from Stage1...</h3>
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Positions</h1>
          <p className="text-muted-foreground">Active and historical position tracking.</p>
          {stage1Error && (
            <p className="text-sm text-red-500 mt-1">Error: {stage1Error}</p>
          )}
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStage1Positions}
          disabled={stage1Loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${stage1Loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active Positions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {/* Risk-Adjusted Metrics */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Risk-Adjusted Metrics (new)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Rolling Sharpe Ratio */}
                <div className="flex items-center gap-3">
                  <Sparkline data={metrics.sharpeHistory} color="#22c55e" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rolling Sharpe Ratio:</p>
                    <p className="text-2xl font-bold">{metrics.rollingSharpe.toFixed(2)}</p>
                  </div>
                </div>

                {/* Max Drawdown */}
                <div className="flex items-center gap-3">
                  <Sparkline data={metrics.drawdownHistory} color="#ef4444" />
                  <div>
                    <p className="text-xs text-muted-foreground">Max Drawdown:</p>
                    <p className="text-2xl font-bold text-red-500">{metrics.maxDrawdown.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Win Rate / Profit Factor */}
                <div className="flex items-center gap-3">
                  <WinRateBars winRate={metrics.winRate} />
                  <div>
                    <p className="text-xs text-muted-foreground">Win Rate / Profit Factor:</p>
                    <p className="text-2xl font-bold">{metrics.winRate}% / {metrics.profitFactor.toFixed(2)}</p>
                  </div>
                </div>

                {/* Returns */}
                <div>
                  <p className="text-xs text-muted-foreground">Returns (Time-Weighted vs Money-Weighted):</p>
                  <p className="text-xl font-bold">
                    <span className="text-green-500">+{metrics.timeWeightedReturn.toFixed(1)}%</span>
                    <span className="text-muted-foreground"> vs </span>
                    <span className="text-green-500">+{metrics.moneyWeightedReturn.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Positions Section */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="positions">
                <div className="border-b px-4">
                  <TabsList className="bg-transparent h-auto p-0 gap-4">
                    <TabsTrigger
                      value="positions"
                      className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2"
                    >
                      Active Positions
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2"
                    >
                      History
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="positions" className="m-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-medium">Model ID</TableHead>
                          <TableHead className="text-xs font-medium">Stream ID</TableHead>
                          <TableHead className="text-xs font-medium">Symbol/Exchange</TableHead>
                          <TableHead className="text-xs font-medium">Side</TableHead>
                          <TableHead className="text-xs font-medium">Entry Price</TableHead>
                          <TableHead className="text-xs font-medium">Qty</TableHead>
                          <TableHead className="text-xs font-medium">SL/TP Levels</TableHead>
                          <TableHead className="text-xs font-medium">Bars Held</TableHead>
                          <TableHead className="text-xs font-medium">Status</TableHead>
                          <TableHead className="text-xs font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayPositions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                              No active positions
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayPositions.map((position) => (
                            <TableRow key={position.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{position.modelId}</TableCell>
                              <TableCell className="text-muted-foreground">{position.streamId}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{position.symbol}</span>
                                  <span className="text-muted-foreground text-xs ml-1">({position.exchange})</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={position.side === "Buy" ? "default" : "secondary"} className={position.side === "Buy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                                  {position.side}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                              <TableCell>{position.qty}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{position.slTpLevels}</TableCell>
                              <TableCell>{position.barsHeld}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={position.cooldownState === "Active" ? "default" : "secondary"}
                                  className={position.cooldownState === "Active"
                                    ? "bg-green-500/20 text-green-500 border-green-500/30"
                                    : position.cooldownState === "Exit Pending"
                                      ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
                                      : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"}
                                >
                                  {position.cooldownState === "Active" ? (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" /> Active</>
                                  ) : position.cooldownState === "Exit Pending" ? (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5" /> Exit Pending</>
                                  ) : (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5" /> {position.cooldownState}</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Checkbox
                                      id={`bracket-${position.id}`}
                                      checked={triggerBracketCheck}
                                      onCheckedChange={(checked) => setTriggerBracketCheck(!!checked)}
                                      className="h-3.5 w-3.5"
                                    />
                                    <label htmlFor={`bracket-${position.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                                      Trigger bracket check
                                    </label>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-xs"
                                    onClick={() => handleForceClose(position)}
                                  >
                                    Force close
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="m-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs font-medium">Model ID</TableHead>
                          <TableHead className="text-xs font-medium">Stream ID</TableHead>
                          <TableHead className="text-xs font-medium">Symbol/Exchange</TableHead>
                          <TableHead className="text-xs font-medium">Side</TableHead>
                          <TableHead className="text-xs font-medium">Entry Price</TableHead>
                          <TableHead className="text-xs font-medium">Exit Price</TableHead>
                          <TableHead className="text-xs font-medium">Qty</TableHead>
                          <TableHead className="text-xs font-medium">Realized PnL</TableHead>
                          <TableHead className="text-xs font-medium">Exit Reason</TableHead>
                          <TableHead className="text-xs font-medium">Dwell Time</TableHead>
                          <TableHead className="text-xs font-medium">Exit Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistoryPositions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                              No position history
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedHistoryPositions.map((position) => (
                            <TableRow key={position.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{position.modelId}</TableCell>
                              <TableCell className="text-muted-foreground">{position.streamId}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{position.symbol}</span>
                                  <span className="text-muted-foreground text-xs ml-1">({position.exchange})</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={position.side === "Buy" ? "default" : "secondary"} className={position.side === "Buy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                                  {position.side}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                              <TableCell>{position.exitPrice > 0 ? formatCurrency(position.exitPrice) : '-'}</TableCell>
                              <TableCell>{position.qty}</TableCell>
                              <TableCell>
                                <span className={position.realizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
                                  {position.realizedPnl >= 0 ? "+" : ""}{formatCurrency(position.realizedPnl)}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{position.exitReason}</TableCell>
                              <TableCell className="text-muted-foreground">{position.dwellTime}</TableCell>
                              <TableCell className="text-muted-foreground">{position.exitDate}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between gap-2 p-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {historyPage} of {totalHistoryPages || 1} ({displayHistoryPositions.length} total)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= totalHistoryPages}
                        onClick={() => setHistoryPage(p => p + 1)}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Full History View */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-medium">Model ID</TableHead>
                      <TableHead className="text-xs font-medium">Stream ID</TableHead>
                      <TableHead className="text-xs font-medium">Symbol/Exchange</TableHead>
                      <TableHead className="text-xs font-medium">Side</TableHead>
                      <TableHead className="text-xs font-medium">Entry Price</TableHead>
                      <TableHead className="text-xs font-medium">Exit Price</TableHead>
                      <TableHead className="text-xs font-medium">Qty</TableHead>
                      <TableHead className="text-xs font-medium">Realized PnL</TableHead>
                      <TableHead className="text-xs font-medium">Exit Reason</TableHead>
                      <TableHead className="text-xs font-medium">Dwell Time</TableHead>
                      <TableHead className="text-xs font-medium">Exit Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayHistoryPositions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No position history
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayHistoryPositions.map((position) => (
                        <TableRow key={position.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{position.modelId}</TableCell>
                          <TableCell className="text-muted-foreground">{position.streamId}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{position.symbol}</span>
                              <span className="text-muted-foreground text-xs ml-1">({position.exchange})</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={position.side === "Buy" ? "default" : "secondary"} className={position.side === "Buy" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                              {position.side}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                          <TableCell>{position.exitPrice > 0 ? formatCurrency(position.exitPrice) : '-'}</TableCell>
                          <TableCell>{position.qty}</TableCell>
                          <TableCell>
                            <span className={position.realizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
                              {position.realizedPnl >= 0 ? "+" : ""}{formatCurrency(position.realizedPnl)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{position.exitReason}</TableCell>
                          <TableCell className="text-muted-foreground">{position.dwellTime}</TableCell>
                          <TableCell className="text-muted-foreground">{position.exitDate}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
        <div>
          Data Sources: <span className="text-primary">{config.stage1ApiBaseUrl}{stage1ActivePositionsPath}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Active: <span className="text-primary font-medium">{stage1ActivePositions.length}</span>
          </span>
          <span>
            Closed: <span className="text-primary font-medium">{stage1HistoryPositions.length}</span>
          </span>
          <div className="flex items-center gap-1.5">
            Stage1:
            {!stage1Error ? (
              <><Wifi className="h-3 w-3 text-green-500" /> <span className="text-green-500">Connected</span></>
            ) : (
              <><WifiOff className="h-3 w-3 text-red-500" /> <span className="text-red-500">Error</span></>
            )}
          </div>
        </div>
      </div>

      {/* Force Close Preview Dialog */}
      <Dialog open={forceCloseDialogOpen} onOpenChange={setForceCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Close Preview ({selectedPosition?.symbol})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated slippage:</span>
              <span>0.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current market price:</span>
              <span>$61,300.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position details:</span>
              <span>{selectedPosition?.qty} @ {selectedPosition ? formatCurrency(selectedPosition.entryPrice) : '-'}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-muted-foreground">Reason:</span>
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forceCloseReasons.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceCloseDialogOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={handleConfirmForceClose}>Next</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Force Close Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Force Close</DialogTitle>
            <DialogDescription>
              Are you sure you want to force close {selectedPosition?.qty} of {selectedPosition?.symbol} at market price? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={executeForceClose}>Confirm Force Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
