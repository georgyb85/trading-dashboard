import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, Play, RotateCcw, Loader2, Database } from "lucide-react";
import { ConfigSidebar } from "@/apps/tradesim/components/ConfigSidebar";
import { PerformanceCards } from "@/apps/tradesim/components/PerformanceCards";
import { TradeTable } from "@/apps/tradesim/components/TradeTable";
import { PerformanceMetrics } from "@/apps/tradesim/components/PerformanceMetrics";
import { ChartSection } from "@/apps/tradesim/components/ChartSection";
import { LoadRunModal } from "@/apps/walkforward/components/LoadRunModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDatasetContext } from "@/contexts/DatasetContext";
import { useRunsContext } from "@/contexts/RunsContext";
import { simulateTrades } from "@/lib/stage1/client";
import type { TradeConfig, StressTestConfig, SimulateTradesResponse, Trade } from "@/lib/stage1/types";
import { toast } from "@/hooks/use-toast";

const TradesimDashboard = () => {
  const { selectedDataset } = useDatasetContext();
  const { lastTradesimRunId, setLastTradesimRun, getCachedRun } = useRunsContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Run selection
  const [loadRunModalOpen, setLoadRunModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedRunName, setSelectedRunName] = useState<string>("");

  // Restore last used run on mount
  useEffect(() => {
    if (lastTradesimRunId && !selectedRunId) {
      const cachedRun = getCachedRun(lastTradesimRunId);
      if (cachedRun) {
        console.log(`[TradesimDashboard] Restoring last run ${lastTradesimRunId.substring(0, 8)} from cache`);
        setSelectedRunId(cachedRun.run_id);
        setSelectedRunName(`Run ${cachedRun.run_id.substring(0, 8)}`);
      }
    }
  }, [lastTradesimRunId, selectedRunId, getCachedRun]);

  // Trade configuration (controlled by ConfigSidebar)
  const [tradeConfig, setTradeConfig] = useState<TradeConfig>({
    position_size: 1000,
    use_signal_exit: true,
    threshold_choice: "optimal_roc",
    use_stop_loss: true,
    stop_loss_pct: 2.0,
    stop_loss_cooldown: 0,
    use_take_profit: true,
    take_profit_pct: 5.0,
    use_time_exit: true,
    max_holding_bars: 50,
  });

  // Stress test configuration
  const [stressTestConfig, setStressTestConfig] = useState<StressTestConfig>({
    bootstrap_iterations: 1000,
    mcpt_iterations: 1000,
    seed: 42,
  });

  // Simulation results
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResults, setSimulationResults] = useState<SimulateTradesResponse | null>(null);

  // Trade filter
  const [tradeFilter, setTradeFilter] = useState<"all" | "long" | "short">("all");

  // Filter trades based on selection
  const filteredTrades = simulationResults?.trades
    ? simulationResults.trades.filter(trade => {
        if (tradeFilter === "all") return true;
        return trade.side === tradeFilter;
      })
    : [];

  // Calculate filtered metrics
  const filteredMetrics = filteredTrades.length > 0 ? {
    totalTrades: filteredTrades.length,
    totalPnL: filteredTrades.reduce((sum, t) => sum + t.pnl, 0),
    winRate: (filteredTrades.filter(t => t.pnl > 0).length / filteredTrades.length) * 100,
    cumulativeReturn: filteredTrades[filteredTrades.length - 1]?.cumulative_return_pct || 0,
  } : null;

  const handleLoadRun = (run: any) => {
    setSelectedRunId(run.run_id);
    setSelectedRunName(`Run ${run.run_id.substring(0, 8)}`);
    setLastTradesimRun(run.run_id);
    setLoadRunModalOpen(false);
    toast({
      title: "Run loaded",
      description: `Loaded run ${run.run_id.substring(0, 8)} from dataset ${run.dataset_slug || run.dataset_id}`,
    });
  };

  const handleRunSimulation = async () => {
    if (!selectedDataset) {
      toast({
        title: "No dataset selected",
        description: "Please select a dataset from the top panel",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRunId) {
      toast({
        title: "No run selected",
        description: "Please select a walkforward run first",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setSimulationResults(null);

    try {
      const response = await simulateTrades({
        dataset_id: selectedDataset,
        run_id: selectedRunId,
        trade_config: tradeConfig,
        stress_test: stressTestConfig,
      });

      if (response.success && response.data) {
        console.log('[TradesimDashboard] ===== SIMULATION RESPONSE =====');
        console.log('[TradesimDashboard] Full response keys:', Object.keys(response.data));
        console.log('[TradesimDashboard] Performance metrics:', response.data.performance);
        console.log('[TradesimDashboard] Buy&Hold metrics:', response.data.buy_hold);
        console.log('[TradesimDashboard] Strategy PnL array length:', response.data.strategy_pnl?.length);
        console.log('[TradesimDashboard] Buy&Hold PnL array length:', response.data.buy_hold_pnl?.length);

        // Sample PnL values from API response
        if (response.data.strategy_pnl && response.data.buy_hold_pnl) {
          console.log('[TradesimDashboard] First 3 strategy_pnl points:', response.data.strategy_pnl.slice(0, 3));
          console.log('[TradesimDashboard] First 3 buy_hold_pnl points:', response.data.buy_hold_pnl.slice(0, 3));
          console.log('[TradesimDashboard] Last 3 strategy_pnl points:', response.data.strategy_pnl.slice(-3));
          console.log('[TradesimDashboard] Last 3 buy_hold_pnl points:', response.data.buy_hold_pnl.slice(-3));
        }
        console.log('[TradesimDashboard] ===== END SIMULATION RESPONSE =====');

        setSimulationResults(response.data);
        toast({
          title: "Simulation complete",
          description: `Generated ${response.data.trades?.length || 0} trades`,
        });
      } else {
        toast({
          title: "Simulation failed",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Simulation error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearResults = () => {
    setSimulationResults(null);
    setTradeFilter("all");
  };

  return (
    <div className="flex min-h-screen bg-background w-full">
      <ConfigSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        tradeConfig={tradeConfig}
        onTradeConfigChange={setTradeConfig}
        stressTestConfig={stressTestConfig}
        onStressTestConfigChange={setStressTestConfig}
      />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-secondary rounded"
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </button>
              )}
              <h1 className="text-xl font-bold text-foreground">Trading Simulation Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setLoadRunModalOpen(true)}
              >
                <Database className="h-4 w-4" />
                {selectedRunId ? `Run: ${selectedRunName}` : "Load Run"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleClearResults}
                disabled={!simulationResults}
              >
                <RotateCcw className="h-4 w-4" />
                Clear Results
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleRunSimulation}
                disabled={isRunning || !selectedRunId || !selectedDataset}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Warnings */}
          {!selectedDataset && (
            <Alert>
              <AlertDescription>
                Please select a dataset from the top panel to run simulations
              </AlertDescription>
            </Alert>
          )}

          {!selectedRunId && (
            <Alert>
              <AlertDescription>
                Please load a walkforward run using the "Load Run" button
              </AlertDescription>
            </Alert>
          )}

          {/* Results Section - Only show if we have simulation results */}
          {simulationResults && (
            <>
              {/* Summary Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Results Summary (Filtered)</h2>
                  {filteredMetrics && (
                    <div className="flex items-center gap-6">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Filtered Trades: </span>
                        <span className="text-foreground font-semibold">
                          {filteredMetrics.totalTrades} / {simulationResults.trades?.length || 0}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Filtered P&L: </span>
                        <span className={`font-semibold ${filteredMetrics.totalPnL >= 0 ? 'profit-text' : 'loss-text'}`}>
                          {filteredMetrics.totalPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Filtered Win Rate: </span>
                        <span className="text-foreground font-semibold">{filteredMetrics.winRate.toFixed(1)}%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Cumulative Return: </span>
                        <span className={`font-semibold ${filteredMetrics.cumulativeReturn >= 0 ? 'profit-text' : 'loss-text'}`}>
                          {filteredMetrics.cumulativeReturn.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <PerformanceCards results={simulationResults} />

              {/* Trade Filter */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Trade Filter:</span>
                <RadioGroup value={tradeFilter} onValueChange={(val) => setTradeFilter(val as any)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="cursor-pointer">Long Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short" className="cursor-pointer">Short Only</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="trades" className="space-y-4">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="trades">Trade List</TabsTrigger>
                  <TabsTrigger value="performance">Performance Report</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                </TabsList>

                <TabsContent value="trades" className="space-y-4">
                  <TradeTable trades={filteredTrades} />
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <PerformanceMetrics results={simulationResults} />
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                  <ChartSection results={simulationResults} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>

      {/* Load Run Modal */}
      <LoadRunModal
        open={loadRunModalOpen}
        onOpenChange={setLoadRunModalOpen}
        datasetId={selectedDataset}
        onLoadRun={handleLoadRun}
      />
    </div>
  );
};

export default TradesimDashboard;
