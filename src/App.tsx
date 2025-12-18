import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TradingLayout } from "./components/TradingLayout";
import { SystemHealthDashboard } from "./components/SystemHealthDashboard";
import { DatasetProvider } from "./contexts/DatasetContext";
import { RunsProvider } from "./contexts/RunsContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import { WalkforwardProvider } from "./contexts/WalkforwardContext";
import { IndicatorProvider } from "./contexts/IndicatorContext";
import { MarketDataProvider } from "./contexts/MarketDataContext";
import { StatusStreamProvider } from "./contexts/StatusStreamContext";
import { PositionsTable } from "./components/PositionsTable";
import { BalancesTable } from "./components/BalancesTable";
import { OrdersTable } from "./components/OrdersTable";
import { LiveMarketData } from "./components/LiveMarketData";
import { RiskManagement } from "./components/RiskManagement";
import NotFound from "./pages/NotFound";
import Indicators from "./pages/Indicators";
import TradesimDashboard from "@/apps/tradesim";
import LfsDashboard from "@/apps/lfs";
import WalkforwardDashboard from "@/apps/walkforward";
import LiveModelPage from "./pages/LiveModel";
import LiveOverview from "./pages/LiveOverview";
import ExecutionHealth from "./pages/ExecutionHealth";
import AuditLogs from "./pages/AuditLogs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/trade">
        <DatasetProvider>
          <RunsProvider>
            <SimulationProvider>
              <WalkforwardProvider>
                <IndicatorProvider>
                  <MarketDataProvider>
                    <StatusStreamProvider>
                      <TradingLayout>
                <Routes>
            <Route path="/" element={<LiveOverview />} />
            <Route path="/overview" element={<LiveOverview />} />
            <Route path="/health" element={<ExecutionHealth />} />
            <Route path="/positions" element={<PositionsTable />} />
            <Route path="/balances" element={<BalancesTable />} />
            <Route path="/orders" element={<OrdersTable />} />
            <Route path="/market" element={<LiveMarketData />} />
            <Route path="/risk" element={<RiskManagement />} />
            <Route path="/indicators" element={<Indicators />} />
            <Route path="/market-data" element={<Indicators />} />
            <Route path="/tradesim" element={<TradesimDashboard />} />
            <Route path="/lfs" element={<LfsDashboard />} />
            <Route path="/walkforward" element={<WalkforwardDashboard />} />
            <Route path="/live-model" element={<LiveModelPage />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </TradingLayout>
                    </StatusStreamProvider>
                  </MarketDataProvider>
                </IndicatorProvider>
              </WalkforwardProvider>
            </SimulationProvider>
          </RunsProvider>
        </DatasetProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
