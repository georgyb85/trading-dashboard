import { useState } from "react";
import { TradingSidebar } from "./TradingSidebar";
import { Activity, Bell, Power, WifiOff, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStage1Datasets } from "@/apps/walkforward/lib/hooks";
import { useDatasetContext } from "@/contexts/DatasetContext";

interface TradingLayoutProps {
  children: React.ReactNode;
}

export function TradingLayout({ children }: TradingLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { selectedDataset, setSelectedDataset } = useDatasetContext();
  const [systemHealth, setSystemHealth] = useState({
    overallStatus: "good" as "good" | "warning" | "error",
    tradingEnabled: true,
    alertsCount: 0,
  });

  const { data: datasets, isLoading: datasetsLoading } = useStage1Datasets();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "status-good";
      case "warning": return "status-warning";
      case "error": return "status-error";
      default: return "status-error";
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      {/* Left Navigation */}
      <aside
        className={`relative border-r border-border transition-all duration-300 ${
          isSidebarOpen ? "w-80" : "w-0"
        }`}
      >
        {isSidebarOpen && (
          <div className="flex h-full flex-col bg-sidebar shadow-lg">
            <TradingSidebar />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-1/2 z-20 h-12 w-6 -translate-y-1/2 rounded-l-none border border-border bg-card p-0 shadow-md"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="text-xl font-semibold tracking-tight">Trading Control Panel</span>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Unified Ops Suite
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Dataset Selector */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">Dataset:</label>
              {datasetsLoading ? (
                <Skeleton className="h-9 w-[200px]" />
              ) : (
                <Select value={selectedDataset || undefined} onValueChange={setSelectedDataset}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets?.map((dataset) => (
                      <SelectItem key={dataset.dataset_id} value={dataset.dataset_id}>
                        {dataset.dataset_slug} ({dataset.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`status-indicator ${getStatusColor(systemHealth.overallStatus)}`} />
              System Status
            </div>

            <Badge variant={systemHealth.tradingEnabled ? "default" : "secondary"} className="gap-1">
              <Power className="h-3 w-3" />
              {systemHealth.tradingEnabled ? "Trading Active" : "Trading Paused"}
            </Badge>

            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {systemHealth.alertsCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
                >
                  {systemHealth.alertsCount}
                </Badge>
              )}
            </Button>

            <ThemeToggle />

            <Button
              variant="destructive"
              size="sm"
              className="emergency-stop"
              onClick={() => {
                setSystemHealth((prev) => ({ ...prev, tradingEnabled: false }));
              }}
            >
              <WifiOff className="h-4 w-4 mr-1" />
              Emergency Stop
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="min-h-full px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
