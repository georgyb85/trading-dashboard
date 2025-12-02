import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { RunsProvider } from "@/contexts/RunsContext";
import { WalkforwardProvider } from "@/contexts/WalkforwardContext";
import { LiveStreamsProvider } from "@/contexts/LiveStreamsContext";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <ConfigProvider>
      <RunsProvider>
        <WalkforwardProvider>
          <LiveStreamsProvider>
            <App />
          </LiveStreamsProvider>
        </WalkforwardProvider>
      </RunsProvider>
    </ConfigProvider>
    <Toaster />
  </ThemeProvider>,
);
