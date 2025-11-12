import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, RotateCcw, Database } from "lucide-react";
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
    exit_strength_pct: 0.8,
    honor_signal_reversal: true,
    threshold_choice: "OptimalROC",
    use_stop_loss: true,
    use_atr_stop_loss: false,
    stop_loss_pct: 3.0,
    atr_multiplier: 2.0,
    atr_period: 14,
    stop_loss_cooldown_bars: 3,
    use_take_profit: true,
    use_atr_take_profit: false,
    take_profit_pct: 3.0,
    atr_tp_multiplier: 3.0,
    atr_tp_period: 14,
    use_time_exit: false,
    max_holding_bars: 10,
    use_limit_orders: false,
    limit_order_window: 5,
    limit_order_offset: 0.001,
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

  // Active tab tracking
  const [activeTab, setActiveTab] = useState<string>("trades");

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
    // Don't clear results - just update them to avoid resetting the UI

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
    setActiveTab("trades");
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
        onRunSimulation={handleRunSimulation}
        isRunning={isRunning}
        canRun={!isRunning && !!selectedRunId && !!selectedDataset}
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
              <PerformanceCards results={simulationResults} tradeFilter={tradeFilter} filteredTrades={filteredTrades} />

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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="trades">Trade List</TabsTrigger>
                  <TabsTrigger value="performance">Performance Report</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                </TabsList>

                <TabsContent value="trades" className="space-y-4">
                  <TradeTable trades={filteredTrades} />
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <PerformanceMetrics results={simulationResults} tradeFilter={tradeFilter} />
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                  <ChartSection results={simulationResults} tradeFilter={tradeFilter} />
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
