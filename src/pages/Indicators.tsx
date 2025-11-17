import { useState, useEffect, useRef } from 'react';
import { useDatasetContext } from '@/contexts/DatasetContext';
import { useIndicatorContext } from '@/contexts/IndicatorContext';
import { validateIndicatorScript, buildIndicators, downloadBinanceOhlcv } from '@/lib/stage1/client';
import type {
  BuildIndicatorsResponse,
  IndicatorDefinition,
  BinanceOhlcvRow,
} from '@/lib/stage1/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import IndicatorDataTable from '@/components/IndicatorDataTable';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import HistogramChart from '@/components/HistogramChart';
import ColumnSelector from '@/components/ColumnSelector';
import * as XLSX from 'xlsx';

const DEFAULT_SCRIPT = `ADX_L: ADX 120
AROON_DIFF_S: AROON DIFF 14
BOL_WIDTH_M: BOLLINGER WIDTH 60
CMMA_S: CLOSE MINUS MOVING AVERAGE 10 250
DTR_RSI_M: DETRENDED RSI 5 20 100
PCO_10_20: ABS PRICE CHANGE OSCILLATOR 10 20
PV_FIT_M: PRICE VOLUME FIT 60`;

const Indicators = () => {
  const { selectedDataset } = useDatasetContext();
  const { getCachedIndicators, cacheIndicators } = useIndicatorContext();
  const { toast } = useToast();
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [maxRows, setMaxRows] = useState(1000);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [buildMode, setBuildMode] = useState<'dataset' | 'binance'>('dataset');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [parallelJobs, setParallelJobs] = useState(4);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  // Build state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildIndicatorsResponse | null>(null);

  // Track the last restored dataset to prevent duplicate restores
  const lastRestoredDataset = useRef<string | null>(null);

  // Restore cached indicators when dataset changes (only once per dataset)
  useEffect(() => {
    if (buildMode === 'dataset' && selectedDataset && selectedDataset !== lastRestoredDataset.current) {
      const cached = getCachedIndicators(selectedDataset);
      if (cached) {
        console.log('[Indicators] Restoring cached indicators for dataset:', selectedDataset);
        setScript(cached.script);
        setMaxRows(cached.maxRows);
        setSelectedColumn(cached.selectedColumn);
        setIsValidated(cached.isValidated);
        setBuildResult(cached.buildResult);
        lastRestoredDataset.current = selectedDataset;
        toast({
          title: 'Indicators restored',
          description: 'Loaded cached script and build results',
        });
      } else {
        // No cache, track this dataset as "restored" (with defaults)
        lastRestoredDataset.current = selectedDataset;
      }
    }
  }, [selectedDataset, getCachedIndicators, toast, buildMode]);

  // Cache indicators state whenever it changes
  useEffect(() => {
    if (buildMode === 'dataset' && selectedDataset) {
      cacheIndicators({
        datasetId: selectedDataset,
        script,
        maxRows,
        selectedColumn,
        isValidated,
        buildResult,
      });
    }
  }, [selectedDataset, script, maxRows, selectedColumn, isValidated, buildResult, cacheIndicators, buildMode]);

  const handleValidate = async () => {
    if (!script.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Script cannot be empty',
      });
      return;
    }

    setIsValidating(true);
    setIsValidated(false);

    try {
      const response = await validateIndicatorScript(script);

      if (response.success && response.data) {
        if (response.data.success) {
          setIsValidated(true);
          const indicatorCount = response.data.definitions?.length || 0;
          toast({
            title: '✓ Script Validated',
            description: `${indicatorCount} indicator${indicatorCount !== 1 ? 's' : ''} validated successfully`,
          });
        } else {
          setIsValidated(false);
          toast({
            variant: 'destructive',
            title: 'Validation Failed',
            description: response.data.message,
          });
        }
      } else {
        setIsValidated(false);
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: response.error || 'Validation failed',
        });
      }
    } catch (error) {
      setIsValidated(false);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBuild = async () => {
    if (!script.trim()) {
      toast({
        variant: 'destructive',
        title: 'Build Error',
        description: 'Script cannot be empty',
      });
      return;
    }

    setIsBuilding(true);
    setBuildResult(null);

    try {
      if (buildMode === 'dataset') {
        if (!selectedDataset) {
          toast({
            variant: 'destructive',
            title: 'Build Error',
            description: 'Please select a dataset from the top panel',
          });
          return;
        }
        const response = await buildIndicators({
          dataset_id: selectedDataset,
          rows: maxRows,
          script: script,
        });

        if (response.success && response.data) {
          setBuildResult(response.data);

          if (response.data.indicator_names && response.data.indicator_names.length > 0) {
            setSelectedColumn(response.data.indicator_names[0]);
          }

          toast({
            title: '✓ Build Successful',
            description: `Built ${response.data.indicator_names?.length || 0} indicator(s) across ${response.data.row_count || 0} rows`,
          });
        } else {
          const errorMsg = response.error || 'Build failed';
          setBuildResult({
            success: false,
            message: errorMsg,
          });
          toast({
            variant: 'destructive',
            title: 'Build Failed',
            description: errorMsg,
          });
        }
      } else {
        if (!fromDate || !toDate) {
          toast({
            variant: 'destructive',
            title: 'Build Error',
            description: 'Please provide from/to dates',
          });
          return;
        }

        const downloadResp = await downloadBinanceOhlcv({
          from_date: fromDate,
          to_date: toDate,
          symbol,
          interval,
          parallel_jobs: parallelJobs,
        });

        if (!downloadResp.success || !downloadResp.data || !downloadResp.data.rows) {
          const errorMsg = downloadResp.error || downloadResp.data?.message || 'Download failed';
          toast({
            variant: 'destructive',
            title: 'Download Error',
            description: errorMsg,
          });
          setBuildResult({
            success: false,
            message: errorMsg,
          });
          return;
        }

        const rows: BinanceOhlcvRow[] = downloadResp.data.rows;
        const buildResp = await buildIndicators({
          script: script,
          ohlcv_rows: rows,
        });

        if (buildResp.success && buildResp.data) {
          setBuildResult(buildResp.data);
          if (buildResp.data.indicator_names && buildResp.data.indicator_names.length > 0) {
            setSelectedColumn(buildResp.data.indicator_names[0]);
          }
          toast({
            title: '✓ Build Successful (Binance)',
            description: `Built ${buildResp.data.indicator_names?.length || 0} indicator(s) across ${buildResp.data.row_count || 0} rows`,
          });
        } else {
          const errorMsg = buildResp.error || buildResp.data?.message || 'Build failed';
          setBuildResult({
            success: false,
            message: errorMsg,
          });
          toast({
            variant: 'destructive',
            title: 'Build Failed',
            description: errorMsg,
          });
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setBuildResult({
        success: false,
        message: errorMsg,
      });
      toast({
        variant: 'destructive',
        title: 'Build Error',
        description: errorMsg,
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleExportToExcel = () => {
    if (!transformedData || transformedData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Export Error',
        description: 'No data to export',
      });
      return;
    }

    // Prepare data for Excel export
    const exportData = transformedData.map((row) => {
      const exportRow: any = {
        Timestamp: new Date(row.timestamp).toLocaleString(),
      };

      // Add all indicator columns
      buildResult?.indicator_names?.forEach((name) => {
        const value = row[name];
        // Keep NaN as string "NaN" in Excel
        exportRow[name] = (value !== null && value !== undefined && !isNaN(value)) ? value : 'NaN';
      });

      return exportRow;
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnCount = columns.length;
    worksheet["!cols"] = [
      { wch: 20 }, // Timestamp column
      ...Array(columnCount - 1).fill({ wch: 15 }), // Indicator columns
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Indicators");

    // Generate filename with timestamp and dataset/symbol info
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const datasetInfo = buildMode === 'dataset'
      ? selectedDataset?.substring(0, 8) || 'data'
      : `${symbol}_${interval}`;
    const filename = `indicators_${datasetInfo}_${timestamp}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);

    toast({
      title: 'Export successful',
      description: `Exported ${transformedData.length} rows to ${filename}`,
    });
  };

  // Transform API response into format expected by existing components
  const transformedData = buildResult?.timestamps && buildResult?.indicator_values
    ? buildResult.timestamps.map((timestamp, idx) => {
        const row: any = {
          timestamp: new Date(timestamp).toISOString()
        };

        buildResult.indicator_names?.forEach((name) => {
          const value = buildResult.indicator_values?.[name]?.[idx];
          row[name] = value;
        });

        return row;
      })
    : [];

  // Pre-calculate min/max ranges for all indicators
  const indicatorRanges = buildResult?.indicator_names && buildResult?.indicator_values
    ? buildResult.indicator_names.reduce((ranges, name) => {
        const values = buildResult.indicator_values?.[name]?.filter(v => v !== null && v !== undefined && !isNaN(v)) || [];
        if (values.length > 0) {
          ranges[name] = {
            min: Math.min(...values),
            max: Math.max(...values),
          };
        } else {
          ranges[name] = { min: 0, max: 0 };
        }
        return ranges;
      }, {} as Record<string, { min: number; max: number }>)
    : {};

  const columns = buildResult?.indicator_names
    ? ['timestamp', ...buildResult.indicator_names]
    : [];

  const indicatorColumns = buildResult?.indicator_names || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Indicator Builder</h1>
        <p className="text-muted-foreground mt-1">Build and visualize custom trading indicators</p>
      </div>

      {/* Controls */}
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Indicator Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data source selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildMode">Data Source</Label>
              <select
                id="buildMode"
                value={buildMode}
                onChange={(e) => setBuildMode(e.target.value as 'dataset' | 'binance')}
                className="border rounded-md px-3 py-2"
              >
                <option value="dataset">Existing Dataset</option>
                <option value="binance">Download from Binance</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Choose an existing dataset or download OHLCV from Binance for a custom period.
              </p>
            </div>

            {buildMode === 'binance' && (
              <div className="space-y-2">
                <Label>Binance Parameters</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Symbol</Label>
                    <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="BTCUSDT" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interval</Label>
                    <Input value={interval} onChange={(e) => setInterval(e.target.value)} placeholder="1h" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Parallel Jobs</Label>
                    <Input
                      type="number"
                      min={1}
                      max={32}
                      value={parallelJobs}
                      onChange={(e) => setParallelJobs(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Script Textarea */}
          <div className="space-y-2">
            <Label htmlFor="script">Script (one indicator per line)</Label>
            <div className="relative">
              <Textarea
                id="script"
                value={script}
                onChange={(e) => {
                  setScript(e.target.value);
                  setIsValidated(false); // Reset validation when script changes
                }}
                placeholder="RSI_S: RSI 14"
                rows={8}
                className={`font-mono text-sm ${isValidated ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
              />
              {isValidated && (
                <div className="absolute top-2 right-2 text-green-500">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Format: VARIABLE_NAME: INDICATOR_TYPE param1 param2 ...
            </p>
          </div>

          {/* Max Rows Input */}
          {buildMode === 'dataset' && (
            <div className="space-y-2">
              <Label htmlFor="maxRows">Max Rows (1-200,000)</Label>
              <Input
                id="maxRows"
                type="number"
                value={maxRows}
                onChange={(e) => setMaxRows(Math.max(1, Math.min(200000, parseInt(e.target.value) || 1000)))}
                min={1}
                max={200000}
                className="w-40"
              />
            </div>
          )}

          {/* Dataset Warning */}
          {buildMode === 'dataset' && !selectedDataset && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a dataset from the top panel to build indicators
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleValidate}
              variant="outline"
              disabled={isValidating || !script.trim()}
              className={isValidated ? 'border-green-500 text-green-600' : ''}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : isValidated ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Validated
                </>
              ) : (
                'Validate Script'
              )}
            </Button>

            <Button
              onClick={handleBuild}
              disabled={
                isBuilding ||
                !script.trim() ||
                (buildMode === 'dataset' && !selectedDataset)
              }
            >
              {isBuilding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building...
                </>
              ) : (
                'Build Indicators'
              )}
            </Button>
          </div>

          {/* Build Error Alert - Only show persistent error for build failures */}
          {buildResult && !buildResult.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{buildResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section - Only show if we have successful build with data */}
      {buildResult?.success && buildResult.row_count && transformedData.length > 0 && (
        <>
          {/* Column Selector */}
          <div className="flex gap-6 items-center bg-card p-4 rounded-lg border border-border">
            <ColumnSelector
              columns={indicatorColumns}
              selectedColumn={selectedColumn}
              onColumnChange={setSelectedColumn}
            />
          </div>

          {/* Data Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Data Preview</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
            <IndicatorDataTable
              data={transformedData}
              columns={columns}
              selectedColumn={selectedColumn}
              onColumnChange={setSelectedColumn}
            />
          </div>

          {/* Charts - Only show if column is selected */}
          {selectedColumn && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TimeSeriesChart data={transformedData} selectedColumn={selectedColumn} />
              <HistogramChart
                data={transformedData}
                selectedColumn={selectedColumn}
                indicatorRanges={indicatorRanges}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Indicators;
