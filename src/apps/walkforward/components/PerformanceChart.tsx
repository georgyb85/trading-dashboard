import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface PerformanceChartProps {
  data: Array<{
    fold: number;
    [key: string]: number;
  }>;
}

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  const runs = Object.keys(data[0] || {}).filter((key) => key !== "fold");
  const colors = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];
  
  const [hiddenRuns, setHiddenRuns] = useState<Set<string>>(new Set());
  const [hoveredRun, setHoveredRun] = useState<string | null>(null);

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

  return (
    <Card className="p-4 relative">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Cumulative Profit</h3>
      </div>
      
      {/* Custom Legend Overlay */}
      <div className="absolute top-16 left-12 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-md p-2 space-y-1">
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
                {run.replace('run', 'Run ')}
              </span>
            </div>
          );
        })}
      </div>

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
