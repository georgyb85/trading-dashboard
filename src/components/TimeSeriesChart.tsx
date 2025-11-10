import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { lttbDownsample } from '@/lib/utils';

interface TimeSeriesChartProps {
  data: any[];
  selectedColumn: string;
}

const TimeSeriesChart = ({ data, selectedColumn }: TimeSeriesChartProps) => {
  const [threshold, setThreshold] = useState([500]);
  
  const chartData = useMemo(() => {
    const fullData = data.map((row, index) => ({
      timestamp: new Date(row.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      value: row[selectedColumn],
      index,
    }));
    
    return lttbDownsample(fullData, threshold[0]);
  }, [data, selectedColumn, threshold]);

  const pointsReduction = data.length > 0 
    ? ((1 - chartData.length / data.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{selectedColumn}</h3>
          <p className="text-xs text-muted-foreground">Time Series Plot</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {chartData.length} / {data.length} points
          </p>
          <p className="text-xs text-primary">-{pointsReduction}%</p>
        </div>
      </div>
      
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs text-muted-foreground whitespace-nowrap">
          Downsample: {threshold[0]}
        </label>
        <Slider
          value={threshold}
          onValueChange={setThreshold}
          min={50}
          max={data.length}
          step={10}
          className="flex-1"
        />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="timestamp" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            stroke="hsl(var(--border))"
          />
          <YAxis 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            stroke="hsl(var(--border))"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
