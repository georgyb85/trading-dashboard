import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

type StrategyType = 'dual' | 'long' | 'short';

interface PerformanceChartProps {
  data: Array<{
    fold: number;
    [key: string]: number;
  }>;
}

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('dual');
  const [hiddenRuns, setHiddenRuns] = useState<Set<string>>(new Set());
  const [hoveredRun, setHoveredRun] = useState<string | null>(null);

  // Get all run keys for the selected strategy
  const runs = Object.keys(data[0] || {}).filter((key) => {
    if (key === "fold") return false;

    // Filter based on selected strategy
    if (selectedStrategy === 'dual') {
      return key.startsWith('run') && key.includes('_dual');
    } else if (selectedStrategy === 'long') {
      return key.startsWith('run') && key.includes('_long');
    } else if (selectedStrategy === 'short') {
      return key.startsWith('run') && key.includes('_short');
    }
    return false;
  });

  const colors = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];

  const toggleRun = (run: string) => {
    setHiddenRuns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(run)) {
        newSet.delete(run);
      } else {
        newSet.add(run);
      }
      return newSet;
    });
  };

  // Format run name for display
  const formatRunName = (runKey: string) => {
    // Extract run number from key like "run1_dual" -> "Run 1"
    const match = runKey.match(/run(\d+)/);
    return match ? `Run ${match[1]}` : runKey;
  };

  return (
    <Card className="p-4 relative">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cumulative Profit</h3>

        {/* Strategy Type Radio Buttons */}
        <div className="flex items-center gap-4 bg-muted/50 rounded-md p-1">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1 rounded hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="strategy"
              value="dual"
              checked={selectedStrategy === 'dual'}
              onChange={() => setSelectedStrategy('dual')}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium">Dual</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1 rounded hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="strategy"
              value="long"
              checked={selectedStrategy === 'long'}
              onChange={() => setSelectedStrategy('long')}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium">Long Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1 rounded hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="strategy"
              value="short"
              checked={selectedStrategy === 'short'}
              onChange={() => setSelectedStrategy('short')}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium">Short Only</span>
          </label>
        </div>
      </div>

      {/* Custom Legend Overlay */}
      {runs.length > 0 && (
        <div className="absolute top-28 left-12 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 space-y-1">
          {runs.map((run, index) => {
            const isHidden = hiddenRuns.has(run);
            const isHovered = hoveredRun === run;

            return (
              <div
                key={run}
                className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded hover:bg-accent/50 transition-colors"
                onClick={() => toggleRun(run)}
                onMouseEnter={() => setHoveredRun(run)}
                onMouseLeave={() => setHoveredRun(null)}
              >
                <div
                  className="w-4 rounded-full transition-all"
                  style={{
                    backgroundColor: colors[index % colors.length],
                    opacity: isHidden ? 0.3 : 1,
                    height: isHovered ? '3px' : '2px'
                  }}
                />
                <span
                  className={`text-xs transition-opacity ${isHidden ? 'opacity-40 line-through' : 'opacity-100'}`}
                >
                  {formatRunName(run)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="fold"
            label={{ value: "Fold Number", position: "insideBottom", offset: -5 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            label={{ value: "Return %", angle: -90, position: "insideLeft" }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)"
            }}
            formatter={(value: number, name: string) => [value.toFixed(2), formatRunName(name)]}
          />
          {runs.map((run, index) => {
            const isHidden = hiddenRuns.has(run);
            const isHovered = hoveredRun === run;

            if (isHidden) return null;

            return (
              <Line
                key={run}
                type="stepAfter"
                dataKey={run}
                stroke={colors[index % colors.length]}
                strokeWidth={isHovered ? 4 : 2}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
