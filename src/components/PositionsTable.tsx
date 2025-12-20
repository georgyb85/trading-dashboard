import { useState, useMemo } from "react";
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
import { TrendingUp, TrendingDown, WifiOff, Loader2, ChevronLeft, ChevronRight, Wifi } from "lucide-react";
import { useAccountStateContext } from "@/contexts/AccountStateContext";
import { useStatusStreamContext } from "@/contexts/StatusStreamContext";
import { config } from "@/lib/config";

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

// Sample data for demonstration
const sampleActivePositions = [
  {
    id: "1",
    modelId: "Model A",
    streamId: "stream_001",
    symbol: "BTC-USD",
    exchange: "Binance",
    entryPrice: 60100.00,
    qty: "1.2 BTC",
    unrealizedPnl: 3560.00,
    slTpLevels: "SL:$58k / TP:$63k",
    barsHeld: 45,
    cooldownState: "Active",
  },
  {
    id: "2",
    modelId: "Model B",
    streamId: "stream_002",
    symbol: "ETH-USD",
    exchange: "Coinbase",
    entryPrice: 4120.00,
    qty: "15 ETH",
    unrealizedPnl: -450.00,
    slTpLevels: "SL:$4k / TP:$4.3k",
    barsHeld: 12,
    cooldownState: "Cooling Down",
  },
  {
    id: "3",
    modelId: "Model A",
    streamId: "stream_003",
    symbol: "SOL-USDT",
    exchange: "Kraken",
    entryPrice: 135.50,
    qty: "80 SOL",
    unrealizedPnl: 9280.00,
    slTpLevels: "SL:$130 / TP:$145",
    barsHeld: 22,
    cooldownState: "Active",
  },
];

const sampleHistoryPositions = [
  {
    id: "h1",
    modelId: "Model A",
    streamId: "stream_001",
    symbol: "BTC-USD",
    exchange: "Coinbase",
    entryPrice: 60100.00,
    exitPrice: 4120.00,
    qty: "1+41,560.00",
    realizedPnl: -450.00,
    dwellTime: "2 hours ago",
    exitDate: "2022-06-27 00:36:00",
  },
];

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
  const [selectedPosition, setSelectedPosition] = useState<typeof sampleActivePositions[0] | null>(null);
  const [selectedReason, setSelectedReason] = useState("manual_close");
  const [historyPage, setHistoryPage] = useState(1);
  const accountWsPath = config.krakenAccountWsPath;
  const livePositionsPath = `${config.traderRestBasePath}/live/positions`;
  const livePositionsHistoryPath = `${config.traderRestBasePath}/live/positions/history`;

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

  // Merge real positions with sample data for display
  const displayPositions = useMemo(() => {
    if (positions.length > 0) {
      return positions.map(pos => ({
        id: pos.id,
        modelId: "Model A",
        streamId: `stream_${pos.id}`,
        symbol: pos.symbol,
        exchange: "Exchange",
        entryPrice: parseFloat(pos.entryPrice),
        qty: `${parseFloat(pos.size).toFixed(4)} ${pos.symbol.split('-')[0]}`,
        unrealizedPnl: parseFloat(pos.pnl),
        slTpLevels: "SL:- / TP:-",
        barsHeld: 0,
        cooldownState: "Active",
      }));
    }
    return sampleActivePositions;
  }, [positions]);

  const handleForceClose = (position: typeof sampleActivePositions[0]) => {
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

  // Loading state
  if (!accountConnected && !accountError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Connecting to Account State...</h3>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (show UI with sample data anyway)
  if (accountError) {
    // Continue with sample data
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Positions</h1>
        <p className="text-muted-foreground">Active and historical position tracking.</p>
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
                          <TableHead className="text-xs font-medium">Entry Price</TableHead>
                          <TableHead className="text-xs font-medium">Qty</TableHead>
                          <TableHead className="text-xs font-medium">Unrealized PnL</TableHead>
                          <TableHead className="text-xs font-medium">SL/TP Levels</TableHead>
                          <TableHead className="text-xs font-medium">Bars Held</TableHead>
                          <TableHead className="text-xs font-medium">Cooldown State</TableHead>
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
                              <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                              <TableCell>{position.qty}</TableCell>
                              <TableCell>
                                <span className={position.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
                                  {position.unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(position.unrealizedPnl)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{position.slTpLevels}</TableCell>
                              <TableCell>{position.barsHeld}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={position.cooldownState === "Active" ? "default" : "secondary"}
                                  className={position.cooldownState === "Active" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"}
                                >
                                  {position.cooldownState === "Active" ? (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" /> Active</>
                                  ) : (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5" /> Cooling Down</>
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
                          <TableHead className="text-xs font-medium">Entry Price</TableHead>
                          <TableHead className="text-xs font-medium">Exit Price</TableHead>
                          <TableHead className="text-xs font-medium">Qty</TableHead>
                          <TableHead className="text-xs font-medium">Realized PnL</TableHead>
                          <TableHead className="text-xs font-medium">Dwell Time</TableHead>
                          <TableHead className="text-xs font-medium">Exit Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleHistoryPositions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No position history
                            </TableCell>
                          </TableRow>
                        ) : (
                          sampleHistoryPositions.map((position) => (
                            <TableRow key={position.id} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{position.modelId}</TableCell>
                              <TableCell className="text-muted-foreground">{position.streamId}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{position.symbol}</span>
                                  <span className="text-muted-foreground text-xs ml-1">({position.exchange})</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                              <TableCell>{formatCurrency(position.exitPrice)}</TableCell>
                              <TableCell>{position.qty}</TableCell>
                              <TableCell>
                                <span className={position.realizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
                                  {position.realizedPnl >= 0 ? "+" : ""}{formatCurrency(position.realizedPnl)}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{position.dwellTime}</TableCell>
                              <TableCell className="text-muted-foreground">{position.exitDate}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-end gap-2 p-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setHistoryPage(p => p + 1)}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
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
                      <TableHead className="text-xs font-medium">Entry Price</TableHead>
                      <TableHead className="text-xs font-medium">Exit Price</TableHead>
                      <TableHead className="text-xs font-medium">Qty</TableHead>
                      <TableHead className="text-xs font-medium">Realized PnL</TableHead>
                      <TableHead className="text-xs font-medium">Dwell Time</TableHead>
                      <TableHead className="text-xs font-medium">Exit Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleHistoryPositions.map((position) => (
                      <TableRow key={position.id} className="hover:bg-muted/20">
                        <TableCell className="font-medium">{position.modelId}</TableCell>
                        <TableCell className="text-muted-foreground">{position.streamId}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{position.symbol}</span>
                            <span className="text-muted-foreground text-xs ml-1">({position.exchange})</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                        <TableCell>{formatCurrency(position.exitPrice)}</TableCell>
                        <TableCell>{position.qty}</TableCell>
                        <TableCell>
                          <span className={position.realizedPnl >= 0 ? "text-green-500" : "text-red-500"}>
                            {position.realizedPnl >= 0 ? "+" : ""}{formatCurrency(position.realizedPnl)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{position.dwellTime}</TableCell>
                        <TableCell className="text-muted-foreground">{position.exitDate}</TableCell>
                      </TableRow>
                    ))}
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
          Data Sources: <span className="text-primary">{accountWsPath}</span>, <span className="text-primary">{livePositionsPath}</span>, <span className="text-primary">{livePositionsHistoryPath}</span>
        </div>
        <div className="flex items-center gap-1.5">
          WebSocket:
          {wsConnected || accountConnected ? (
            <><Wifi className="h-3 w-3 text-green-500" /> <span className="text-green-500">Connected</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-red-500" /> <span className="text-red-500">Disconnected</span></>
          )}
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
