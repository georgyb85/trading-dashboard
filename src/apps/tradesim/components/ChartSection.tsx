import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

const pnlData = [
  { date: "3/15", strategy: 0, buyHold: 0 },
  { date: "3/22", strategy: 80, buyHold: 40 },
  { date: "3/29", strategy: -50, buyHold: 60 },
  { date: "4/1", strategy: -80, buyHold: 50 },
  { date: "4/8", strategy: 20, buyHold: 80 },
  { date: "4/15", strategy: 90, buyHold: 100 },
  { date: "4/22", strategy: 120, buyHold: 120 },
  { date: "5/1", strategy: 180, buyHold: 150 },
  { date: "5/8", strategy: 220, buyHold: 180 },
  { date: "5/15", strategy: 240, buyHold: 200 },
  { date: "5/22", strategy: 280, buyHold: 220 },
  { date: "5/29", strategy: 250, buyHold: 210 },
  { date: "6/1", strategy: 260, buyHold: 230 },
  { date: "6/8", strategy: 300, buyHold: 250 },
  { date: "6/15", strategy: 320, buyHold: 270 },
  { date: "6/22", strategy: 340, buyHold: 280 },
  { date: "7/1", strategy: 380, buyHold: 310 },
  { date: "7/8", strategy: 420, buyHold: 340 },
  { date: "7/15", strategy: 460, buyHold: 370 },
  { date: "7/22", strategy: 500, buyHold: 400 },
  { date: "7/29", strategy: 480, buyHold: 420 },
  { date: "8/1", strategy: 420, buyHold: 400 },
];

const drawdownData = [
  { date: "3/15", strategy: 0, buyHold: 0, strategyDD: 0 },
  { date: "3/22", strategy: -2, buyHold: -1, strategyDD: 0 },
  { date: "3/29", strategy: -8, buyHold: -3, strategyDD: -2 },
  { date: "4/1", strategy: -12, buyHold: -5, strategyDD: -5 },
  { date: "4/8", strategy: -18, buyHold: -8, strategyDD: -8 },
  { date: "4/15", strategy: -15, buyHold: -10, strategyDD: -10 },
  { date: "4/22", strategy: -10, buyHold: -8, strategyDD: -8 },
  { date: "5/1", strategy: -5, buyHold: -6, strategyDD: -6 },
  { date: "5/8", strategy: -3, buyHold: -8, strategyDD: -4 },
  { date: "5/15", strategy: -2, buyHold: -10, strategyDD: -3 },
  { date: "5/22", strategy: 0, buyHold: -8, strategyDD: -2 },
  { date: "5/29", strategy: -6, buyHold: -12, strategyDD: -8 },
  { date: "6/1", strategy: -8, buyHold: -10, strategyDD: -10 },
  { date: "6/8", strategy: -4, buyHold: -8, strategyDD: -6 },
  { date: "6/15", strategy: -2, buyHold: -6, strategyDD: -4 },
  { date: "6/22", strategy: -1, buyHold: -5, strategyDD: -2 },
  { date: "7/1", strategy: 0, buyHold: -4, strategyDD: -1 },
  { date: "7/8", strategy: 0, buyHold: -3, strategyDD: 0 },
  { date: "7/15", strategy: 0, buyHold: -2, strategyDD: 0 },
  { date: "7/22", strategy: 0, buyHold: -1, strategyDD: 0 },
  { date: "7/29", strategy: -4, buyHold: -3, strategyDD: -4 },
  { date: "8/1", strategy: -12, buyHold: -8, strategyDD: -10 },
];

const maxDrawdown = 6.26;

export const ChartSection = () => {
  return (
    <div className="space-y-4">
      {/* Cumulative P&L Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Cumulative P&L (Filtered)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="strategy"
                name="Strategy"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="buyHold"
                name="Buy & Hold"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Strategy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Buy & Hold</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Drawdown % (Filtered)</CardTitle>
            <span className="text-sm text-destructive font-medium">Strategy Max DD: {maxDrawdown}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="strategyDD"
                name="Strategy DD"
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="strategy"
                name="Strategy"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="buyHold"
                name="Buy & Hold"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-chart-1"></div>
              <span className="text-muted-foreground">Strategy DD</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Strategy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Buy & Hold</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
