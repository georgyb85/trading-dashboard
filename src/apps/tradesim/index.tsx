import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, Play, RotateCcw } from "lucide-react";
import { ConfigSidebar } from "@/apps/tradesim/components/ConfigSidebar";
import { PerformanceCards } from "@/apps/tradesim/components/PerformanceCards";
import { TradeTable } from "@/apps/tradesim/components/TradeTable";
import { PerformanceMetrics } from "@/apps/tradesim/components/PerformanceMetrics";
import { ChartSection } from "@/apps/tradesim/components/ChartSection";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradeSimulationRuns } from "@/lib/hooks/useApi";

const TradesimDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSimulationId, setSelectedSimulationId] = useState<number | undefined>();
  const [tradeFilter, setTradeFilter] = useState<'all' | 'long' | 'short'>('all');

  const { data: simulationsResponse, isLoading } = useTradeSimulationRuns();
  const simulations = simulationsResponse?.data || [];

  return (
    <div className="flex min-h-screen bg-background w-full">
      <ConfigSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
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
              <Select value={selectedSimulationId?.toString()} onValueChange={(val) => setSelectedSimulationId(Number(val))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select simulation run" />
                </SelectTrigger>
                <SelectContent>
                  {simulations.map((sim) => (
                    <SelectItem key={sim.id} value={sim.id.toString()}>
                      {sim.name} - {sim.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Clear Results
              </Button>
              <Button size="sm" className="gap-2" disabled={isLoading}>
                <Play className="h-4 w-4" />
                Run Simulation
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Summary Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Results Summary (Filtered)</h2>
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-muted-foreground">Filtered Trades: </span>
                  <span className="text-foreground font-semibold">33 / 70</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Filtered P&L: </span>
                  <span className="profit-text font-semibold">491.18</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Filtered Win Rate: </span>
                  <span className="text-foreground font-semibold">60.6%</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Cumulative Return: </span>
                  <span className="profit-text font-semibold">49.12%</span>
                </div>
              </div>
            </div>
          </div>

          <PerformanceCards />

          {/* Trade Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Trade Filter:</span>
            <RadioGroup value={tradeFilter} onValueChange={(v: any) => setTradeFilter(v)} className="flex gap-4">
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
              <TradeTable
                simulationId={selectedSimulationId}
                tradeType={tradeFilter === 'all' ? undefined : tradeFilter === 'long' ? 'Long' : 'Short'}
              />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceMetrics />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <ChartSection />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TradesimDashboard;
