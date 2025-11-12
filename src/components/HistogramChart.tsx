import { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface HistogramChartProps {
  data: any[];
  selectedColumn: string;
  indicatorRanges?: Record<string, { min: number; max: number }>;
}

interface HistogramCacheEntry {
  allValues: number[];
  dataMin: number;
  dataMax: number;
  lastSettings: {
    binCount: number;
    rangeMin: string;
    rangeMax: string;
    rangeMinPercent: number;
    rangeMaxPercent: number;
    showTails: boolean;
    normalize: boolean;
  };
  cachedBins: Map<string, any>;
}

const HistogramChart = ({ data, selectedColumn, indicatorRanges }: HistogramChartProps) => {
  // Cache per indicator: stores processed values and histogram results
  const cacheRef = useRef<Map<string, HistogramCacheEntry>>(new Map());

  // Get or create cache entry for current indicator
  const { allValues, dataMin, dataMax } = useMemo(() => {
    const cache = cacheRef.current;
    let cacheEntry = cache.get(selectedColumn);

    const values = data
      .map((row) => row[selectedColumn])
      .filter((v) => v !== null && v !== undefined && !isNaN(v));

    // Determine the correct min/max to use
    let min: number;
    let max: number;

    if (indicatorRanges && indicatorRanges[selectedColumn]) {
      // Use pre-calculated ranges (most reliable)
      min = indicatorRanges[selectedColumn].min;
      max = indicatorRanges[selectedColumn].max;
      console.log(`[HistogramChart] Using pre-calculated range for ${selectedColumn}: [${min.toFixed(2)}, ${max.toFixed(2)}]`);
    } else if (values.length > 0) {
      // Fall back to computing from values
      min = Math.min(...values);
      max = Math.max(...values);
      console.log(`[HistogramChart] Computing range for ${selectedColumn}: [${min.toFixed(2)}, ${max.toFixed(2)}]`);
    } else {
      min = 0;
      max = 0;
      console.warn(`[HistogramChart] No data for ${selectedColumn}, using 0-0 range`);
    }

    if (!cacheEntry) {
      // Create new cache entry
      cacheEntry = {
        allValues: values,
        dataMin: min,
        dataMax: max,
        lastSettings: {
          binCount: 40,
          rangeMin: min.toFixed(2),
          rangeMax: max.toFixed(2),
          rangeMinPercent: 0,
          rangeMaxPercent: 100,
          showTails: true,
          normalize: false,
        },
        cachedBins: new Map(),
      };
      cache.set(selectedColumn, cacheEntry);
      console.log(`[HistogramChart] Created new cache entry for ${selectedColumn}`);
    } else if (cacheEntry.dataMin !== min || cacheEntry.dataMax !== max) {
      // Update cache entry if min/max changed (e.g., indicatorRanges became available)
      console.log(`[HistogramChart] Updating cache for ${selectedColumn}: [${cacheEntry.dataMin}, ${cacheEntry.dataMax}] -> [${min}, ${max}]`);
      cacheEntry.dataMin = min;
      cacheEntry.dataMax = max;
      // Update lastSettings ONLY if they were never customized (still at 0-100%)
      if (!cacheEntry.lastSettings || (cacheEntry.lastSettings.rangeMinPercent === 0 && cacheEntry.lastSettings.rangeMaxPercent === 100)) {
        cacheEntry.lastSettings = {
          binCount: 40,
          rangeMin: min.toFixed(2),
          rangeMax: max.toFixed(2),
          rangeMinPercent: 0,
          rangeMaxPercent: 100,
          showTails: true,
          normalize: false,
        };
      }
    }

    return {
      allValues: cacheEntry.allValues,
      dataMin: cacheEntry.dataMin,
      dataMax: cacheEntry.dataMax,
    };
  }, [data, selectedColumn, indicatorRanges]);
  
  const [binCount, setBinCount] = useState([40]);
  const [rangeMin, setRangeMin] = useState('0');
  const [rangeMax, setRangeMax] = useState('0');
  const [rangeMinPercent, setRangeMinPercent] = useState([0]);
  const [rangeMaxPercent, setRangeMaxPercent] = useState([100]);
  const [showTails, setShowTails] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [normalize, setNormalize] = useState(false);

  // Restore or initialize settings when indicator changes
  useEffect(() => {
    const entry = cacheRef.current.get(selectedColumn);

    // Check if this indicator has been customized (lastSettings exist and differ from defaults)
    const hasCustomSettings = entry?.lastSettings && (
      entry.lastSettings.rangeMinPercent !== 0 ||
      entry.lastSettings.rangeMaxPercent !== 100 ||
      entry.lastSettings.binCount !== 40 ||
      entry.lastSettings.showTails !== true ||
      entry.lastSettings.normalize !== false
    );

    if (hasCustomSettings) {
      // Restore cached CUSTOMIZED settings for this indicator
      const settings = entry.lastSettings!;
      setBinCount([settings.binCount]);
      setRangeMin(settings.rangeMin);
      setRangeMax(settings.rangeMax);
      setRangeMinPercent([settings.rangeMinPercent]);
      setRangeMaxPercent([settings.rangeMaxPercent]);
      setShowTails(settings.showTails);
      setNormalize(settings.normalize);
      console.log(`[HistogramChart] Restored customized settings for ${selectedColumn}:`, settings);
    } else {
      // Initialize with THIS indicator's min/max from cache (already correct from useMemo)
      setBinCount([40]);
      setRangeMin(dataMin.toFixed(2));
      setRangeMax(dataMax.toFixed(2));
      setRangeMinPercent([0]);
      setRangeMaxPercent([100]);
      setShowTails(true);
      setNormalize(false);
      console.log(`[HistogramChart] Initialized ${selectedColumn} with range [${dataMin.toFixed(2)}, ${dataMax.toFixed(2)}]`);
    }
  }, [selectedColumn, dataMin, dataMax]);
  
  // Sync text inputs with sliders
  const handleMinPercentChange = (value: number[]) => {
    setRangeMinPercent(value);
    const newMin = dataMin + (dataMax - dataMin) * (value[0] / 100);
    setRangeMin(newMin.toFixed(2));
  };
  
  const handleMaxPercentChange = (value: number[]) => {
    setRangeMaxPercent(value);
    const newMax = dataMin + (dataMax - dataMin) * (value[0] / 100);
    setRangeMax(newMax.toFixed(2));
  };
  
  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRangeMin(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const percent = ((numValue - dataMin) / (dataMax - dataMin)) * 100;
      setRangeMinPercent([Math.max(0, Math.min(100, percent))]);
    }
  };
  
  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRangeMax(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const percent = ((numValue - dataMin) / (dataMax - dataMin)) * 100;
      setRangeMaxPercent([Math.max(0, Math.min(100, percent))]);
    }
  };
  
  const handleAutoRange = () => {
    setRangeMin(dataMin.toFixed(2));
    setRangeMax(dataMax.toFixed(2));
    setRangeMinPercent([0]);
    setRangeMaxPercent([100]);
  };

  const { bins, statistics, lowerTailCount, upperTailCount } = useMemo(() => {
    if (allValues.length === 0) return { bins: [], statistics: null, lowerTailCount: 0, upperTailCount: 0 };

    // Create cache key from all settings
    const cacheKey = `${binCount[0]}_${rangeMin}_${rangeMax}_${showTails}_${normalize}`;
    const entry = cacheRef.current.get(selectedColumn);

    // Check cache first
    if (entry?.cachedBins.has(cacheKey)) {
      console.log(`[HistogramChart] Using cached bins for ${selectedColumn}`);
      return entry.cachedBins.get(cacheKey);
    }

    console.log(`[HistogramChart] Computing bins for ${selectedColumn}`);

    const min = parseFloat(rangeMin);
    const max = parseFloat(rangeMax);
    const numBins = binCount[0];
    const binSize = (max - min) / numBins;

    type BinType = { range: string; count: number; type: 'regular' | 'lowerTail' | 'upperTail' };

    const regularBins: BinType[] = Array.from({ length: numBins }, (_, i) => ({
      range: (min + i * binSize).toFixed(1),
      count: 0,
      type: 'regular' as const,
    }));

    let lowerTail = 0;
    let upperTail = 0;

    // Fill bins and count tails
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

    // Create final bins array with tails
    let finalBins: BinType[] = [...regularBins];
    if (showTails) {
      if (lowerTail > 0) {
        finalBins = [{ range: `<${min.toFixed(1)}`, count: lowerTail, type: 'lowerTail' as const }, ...finalBins];
      }
      if (upperTail > 0) {
        finalBins = [...finalBins, { range: `>${max.toFixed(1)}`, count: upperTail, type: 'upperTail' as const }];
      }
    }

    // Normalize if needed
    if (normalize && finalBins.length > 0) {
      const total = finalBins.reduce((sum, bin) => sum + bin.count, 0);
      finalBins = finalBins.map(bin => ({
        ...bin,
        count: (bin.count / total) * 100,
      }));
    }

    // Statistics
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const sortedValues = [...allValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const variance = allValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allValues.length;
    const stdDev = Math.sqrt(variance);
    const skewness = allValues.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / allValues.length;
    const kurtosis = allValues.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / allValues.length;

    const result = {
      bins: finalBins,
      statistics: { mean, median, stdDev, min: dataMin, max: dataMax, skewness, kurtosis },
      lowerTailCount: lowerTail,
      upperTailCount: upperTail,
    };

    // Cache the result
    if (entry) {
      entry.cachedBins.set(cacheKey, result);
      // Save current settings
      entry.lastSettings = {
        binCount: binCount[0],
        rangeMin,
        rangeMax,
        rangeMinPercent: rangeMinPercent[0],
        rangeMaxPercent: rangeMaxPercent[0],
        showTails,
        normalize,
      };
    }

    return result;
  }, [allValues, rangeMin, rangeMax, binCount, showTails, normalize, dataMin, dataMax, selectedColumn, rangeMinPercent, rangeMaxPercent]);

  if (allValues.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-4 flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const hasTails = lowerTailCount > 0 || upperTailCount > 0;
  const chartTitle = hasTails && showTails ? `${selectedColumn} (with tails)` : selectedColumn;

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Indicator: {chartTitle}</h3>
      
      {/* Controls Row */}
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
          <Checkbox id="normalize" checked={normalize} onCheckedChange={(checked) => setNormalize(checked === true)} />
          <Label htmlFor="normalize" className="text-xs cursor-pointer">Normalize</Label>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Checkbox id="showStats" checked={showStats} onCheckedChange={(checked) => setShowStats(checked === true)} />
          <Label htmlFor="showStats" className="text-xs cursor-pointer">Show Stats</Label>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Checkbox id="showTails" checked={showTails} onCheckedChange={(checked) => setShowTails(checked === true)} />
          <Label htmlFor="showTails" className="text-xs cursor-pointer">Show Tails</Label>
        </div>
      </div>

      {/* Range Controls */}
      <div className="mb-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Label className="text-xs w-14">Range:</Label>
          <Input
            type="number"
            value={rangeMin}
            onChange={handleMinInputChange}
            className="h-7 w-24 text-xs"
            step="0.01"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            value={rangeMax}
            onChange={handleMaxInputChange}
            className="h-7 w-24 text-xs"
            step="0.01"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs w-14">Range %:</Label>
          <Slider
            value={rangeMinPercent}
            onValueChange={handleMinPercentChange}
            min={0}
            max={100}
            step={0.1}
            className="w-24"
          />
          <span className="text-muted-foreground w-12 text-right">{rangeMinPercent[0].toFixed(1)}%</span>
          <span className="text-muted-foreground">to</span>
          <Slider
            value={rangeMaxPercent}
            onValueChange={handleMaxPercentChange}
            min={0}
            max={100}
            step={0.1}
            className="w-24"
          />
          <span className="text-muted-foreground w-12 text-right">{rangeMaxPercent[0].toFixed(1)}%</span>
        </div>
        
        <div className="text-muted-foreground">
          Data bounds: {dataMin.toFixed(2)} to {dataMax.toFixed(2)}
        </div>
      </div>
      
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
            formatter={(value: any) => [normalize ? `${value.toFixed(2)}%` : value, normalize ? 'Frequency' : 'Count']}
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

      {showStats && statistics && (
        <>
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Mean</div>
              <div className="font-mono text-foreground">{statistics.mean.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Median</div>
              <div className="font-mono text-foreground">{statistics.median.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Std Dev</div>
              <div className="font-mono text-foreground">{statistics.stdDev.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Samples</div>
              <div className="font-mono text-foreground">{allValues.length}/{data.length}</div>
            </div>
          </div>
          
          <div className="mt-2 grid grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Min</div>
              <div className="font-mono text-foreground">{statistics.min.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Max</div>
              <div className="font-mono text-foreground">{statistics.max.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Skewness</div>
              <div className="font-mono text-foreground">{statistics.skewness.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Kurtosis</div>
              <div className="font-mono text-foreground">{statistics.kurtosis.toFixed(3)}</div>
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

export default HistogramChart;
