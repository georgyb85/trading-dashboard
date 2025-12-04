import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RunsProvider } from "@/contexts/RunsContext";
import { WalkforwardProvider } from "@/contexts/WalkforwardContext";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <RunsProvider>
      <WalkforwardProvider>
        <App />
      </WalkforwardProvider>
    </RunsProvider>
    <Toaster />
  </ThemeProvider>,
);
