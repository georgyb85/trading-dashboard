import { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { lttbDownsample } from '@/lib/utils';
import { IndicatorSnapshot } from '@/hooks/useMarketDataStream';

interface LiveTimeSeriesChartProps {
  data: IndicatorSnapshot[];
  selectedIndicatorIndex: number;
  indicatorName: string;
}

export const LiveTimeSeriesChart = ({ data, selectedIndicatorIndex, indicatorName }: LiveTimeSeriesChartProps) => {
  const [threshold, setThreshold] = useState([500]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Data comes newest-first from backend, reverse to get chronological order (oldest first)
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    const fullData = sortedData.map((snapshot, index) => {
      const value = snapshot.values?.[selectedIndicatorIndex];
      return {
        timestamp: new Date(snapshot.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit' }),
        value: (value !== null && value !== undefined && !isNaN(value)) ? value : null,
        index,
      };
    });

    // Apply downsampling
    return lttbDownsample(fullData, threshold[0]);
  }, [data, selectedIndicatorIndex, threshold]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-4 flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const pointsReduction = data.length > 0
    ? ((1 - chartData.length / data.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{indicatorName}</h3>
          <p className="text-xs text-muted-foreground">Time Series Plot (Live)</p>
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
          max={Math.max(data.length, 100)}
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
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface LiveHistogramChartProps {
  data: IndicatorSnapshot[];
  selectedIndicatorIndex: number;
  indicatorName: string;
}

export const LiveHistogramChart = ({ data, selectedIndicatorIndex, indicatorName }: LiveHistogramChartProps) => {
  const [binCount, setBinCount] = useState([40]);
  const [showTails, setShowTails] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [normalize, setNormalize] = useState(false);
  const [rangeMin, setRangeMin] = useState('0');
  const [rangeMax, setRangeMax] = useState('0');

  const { allValues, dataMin, dataMax } = useMemo(() => {
    if (!data || data.length === 0) {
      return { allValues: [], dataMin: 0, dataMax: 0 };
    }

    const values = data
      .map((snapshot) => snapshot.values?.[selectedIndicatorIndex])
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return { allValues: values, dataMin: min, dataMax: max };
  }, [data, selectedIndicatorIndex]);

  // Update range when indicator changes or data bounds change
  useEffect(() => {
    setRangeMin(dataMin.toFixed(2));
    setRangeMax(dataMax.toFixed(2));
  }, [dataMin, dataMax, selectedIndicatorIndex]);

  const handleAutoRange = () => {
    setRangeMin(dataMin.toFixed(2));
    setRangeMax(dataMax.toFixed(2));
  };

  const { bins, statistics, lowerTailCount, upperTailCount } = useMemo(() => {
    if (allValues.length === 0) return { bins: [], statistics: null, lowerTailCount: 0, upperTailCount: 0 };

    const min = parseFloat(rangeMin) || 0;
    const max = parseFloat(rangeMax) || 0;

    // Avoid division by zero
    if (max <= min) {
      return { bins: [], statistics: null, lowerTailCount: 0, upperTailCount: 0 };
    }

    const numBins = binCount[0];
    const binSize = (max - min) / numBins;

    type BinType = { range: string; count: number; type: 'regular' | 'lowerTail' | 'upperTail' };

    const regularBins: BinType[] = Array.from({ length: numBins }, (_, i) => ({
      range: (min + i * binSize).toFixed(2),
      count: 0,
      type: 'regular' as const,
    }));

    let lowerTail = 0;
    let upperTail = 0;

    allValues.forEach((value) => {
      if (value < min) {
        lowerTail++;
      } else if (value > max) {
        upperTail++;
      } else {
        const binIndex = Math.min(Math.floor((value - min) / binSize), numBins - 1);
        if (binIndex >= 0 && binIndex < numBins) {
          regularBins[binIndex].count++;
        }
      }
    });

    let finalBins: BinType[] = [...regularBins];
    if (showTails) {
      if (lowerTail > 0) {
        finalBins = [{ range: `<${min.toFixed(1)}`, count: lowerTail, type: 'lowerTail' as const }, ...finalBins];
      }
      if (upperTail > 0) {
        finalBins = [...finalBins, { range: `>${max.toFixed(1)}`, count: upperTail, type: 'upperTail' as const }];
      }
    }

    if (normalize && finalBins.length > 0) {
      const total = finalBins.reduce((sum, bin) => sum + bin.count, 0);
      if (total > 0) {
        finalBins = finalBins.map(bin => ({
          ...bin,
          count: (bin.count / total) * 100,
        }));
      }
    }

    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const sortedValues = [...allValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const variance = allValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allValues.length;
    const stdDev = Math.sqrt(variance);
    const skewness = stdDev > 0 ? allValues.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / allValues.length : 0;
    const kurtosis = stdDev > 0 ? allValues.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / allValues.length : 0;

    return {
      bins: finalBins,
      statistics: { mean, median, stdDev, min: dataMin, max: dataMax, skewness, kurtosis },
      lowerTailCount: lowerTail,
      upperTailCount: upperTail,
    };
  }, [allValues, rangeMin, rangeMax, binCount, showTails, normalize, dataMin, dataMax]);

  if (!data || data.length === 0 || allValues.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-4 flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const hasTails = lowerTailCount > 0 || upperTailCount > 0;

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{indicatorName} Distribution</h3>

      <div className="mb-3 flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Bins:</Label>
          <Slider
            value={binCount}
            onValueChange={setBinCount}
            min={5}
            max={200}
            step={1}
            className="w-20"
          />
          <span className="text-muted-foreground w-8">{binCount[0]}</span>
        </div>

        <Button onClick={handleAutoRange} variant="outline" size="sm" className="h-7 text-xs">
          Auto Range
        </Button>

        <div className="flex items-center gap-1.5">
          <Checkbox id={`normalize-${indicatorName}`} checked={normalize} onCheckedChange={(checked) => setNormalize(checked === true)} />
          <Label htmlFor={`normalize-${indicatorName}`} className="text-xs cursor-pointer">Normalize</Label>
        </div>

        <div className="flex items-center gap-1.5">
          <Checkbox id={`showStats-${indicatorName}`} checked={showStats} onCheckedChange={(checked) => setShowStats(checked === true)} />
          <Label htmlFor={`showStats-${indicatorName}`} className="text-xs cursor-pointer">Show Stats</Label>
        </div>

        <div className="flex items-center gap-1.5">
          <Checkbox id={`showTails-${indicatorName}`} checked={showTails} onCheckedChange={(checked) => setShowTails(checked === true)} />
          <Label htmlFor={`showTails-${indicatorName}`} className="text-xs cursor-pointer">Show Tails</Label>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs">
        <Label className="text-xs w-14">Range:</Label>
        <Input
          type="number"
          value={rangeMin}
          onChange={(e) => setRangeMin(e.target.value)}
          className="h-7 w-24 text-xs"
          step="0.01"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="number"
          value={rangeMax}
          onChange={(e) => setRangeMax(e.target.value)}
          className="h-7 w-24 text-xs"
          step="0.01"
        />
      </div>

      {bins.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bins} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="range"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              stroke="hsl(var(--border))"
              interval={Math.floor(bins.length / 10)}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              stroke="hsl(var(--border))"
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px',
                fontSize: '11px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontSize: '11px' }}
              formatter={(value: any) => [normalize ? `${Number(value).toFixed(2)}%` : value, normalize ? 'Frequency' : 'Count']}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {bins.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.type === 'lowerTail' ? 'hsl(0 84% 60%)' :
                    entry.type === 'upperTail' ? 'hsl(263 70% 50%)' :
                    'hsl(var(--chart-1))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
          Invalid range - adjust min/max values
        </div>
      )}

      {showStats && statistics && (
        <>
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Mean</div>
              <div className="font-mono text-foreground">{statistics.mean.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Median</div>
              <div className="font-mono text-foreground">{statistics.median.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Std Dev</div>
              <div className="font-mono text-foreground">{statistics.stdDev.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Samples</div>
              <div className="font-mono text-foreground">{allValues.length}/{data.length}</div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Min</div>
              <div className="font-mono text-foreground">{statistics.min.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Max</div>
              <div className="font-mono text-foreground">{statistics.max.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Skewness</div>
              <div className="font-mono text-foreground">{statistics.skewness.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Kurtosis</div>
              <div className="font-mono text-foreground">{statistics.kurtosis.toFixed(4)}</div>
            </div>
          </div>

          {hasTails && showTails && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Tail counts:</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Lower</div>
                  <div className="font-mono text-foreground">{lowerTailCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Upper</div>
                  <div className="font-mono text-foreground">{upperTailCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total tails</div>
                  <div className="font-mono text-foreground">{lowerTailCount + upperTailCount}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
