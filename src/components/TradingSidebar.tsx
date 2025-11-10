import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Brain,
  DollarSign,
  Settings,
  Shield,
  TrendingUp,
  Wallet,
  ClipboardList,
  Zap,
  PlayCircle,
  Filter,
  Route,
  LineChart,
} from "lucide-react";

const navigationItems = [
  {
    title: "System Health",
    url: "/",
    icon: Activity,
    description: "Monitor system status"
  },
  {
    title: "Trading Overview",
    url: "/trading",
    icon: TrendingUp,
    description: "Trading statistics"
  },
  {
    title: "Positions",
    url: "/positions",
    icon: DollarSign,
    description: "All open positions"
  },
  {
    title: "Balances",
    url: "/balances",
    icon: Wallet,
    description: "Account balances"
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ClipboardList,
    description: "Order management"
  },
  {
    title: "Live Market Data",
    url: "/market",
    icon: Zap,
    description: "Real-time prices & trades"
  },
  {
    title: "ML Model Monitor",
    url: "/model",
    icon: Brain,
    description: "ML predictions"
  },
  {
    title: "Risk Management",
    url: "/risk",
    icon: Shield,
    description: "Risk controls"
  },
  {
    title: "Strategy Config",
    url: "/config",
    icon: Settings,
    description: "Trading parameters"
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    description: "Performance reports"
  },
  {
    title: "Indicators",
    url: "/indicators",
    icon: LineChart,
    description: "Trading indicator analysis"
  },
  {
    title: "Trade Simulator",
    url: "/tradesim",
    icon: PlayCircle,
    description: "Scenario testing workspace"
  },
  {
    title: "Feature Selection",
    url: "/lfs",
    icon: Filter,
    description: "Local feature selection toolkit"
  },
  {
    title: "Walkforward Pilot",
    url: "/walkforward",
    icon: Route,
    description: "Cross-validation orchestration"
  },
];

export function TradingSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-6 py-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/50">
            Navigation
          </span>
          <h1 className="text-2xl font-semibold text-sidebar-foreground">Control Center</h1>
          <p className="text-xs text-sidebar-foreground/60">
            Jump between monitoring, research, and simulation workspaces.
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 transition-all duration-200",
                  isActive(item.url)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    isActive(item.url)
                      ? "text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                  )}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">{item.title}</span>
                  <span className="text-xs text-sidebar-foreground/55 leading-tight">
                    {item.description}
                  </span>
                </div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/50">
          Connections
        </span>
        <div className="mt-4 space-y-3 text-sm text-sidebar-foreground/80">
          <div className="flex items-center gap-2">
            <span className="status-indicator status-good" />
            <span>MEXC</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-indicator status-good" />
            <span>Bybit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-indicator status-good" />
            <span>ML Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
