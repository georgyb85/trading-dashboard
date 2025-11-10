import { useState, useEffect } from 'react';
import TableSelector from '@/components/TableSelector';
import ColumnSelector from '@/components/ColumnSelector';
import IndicatorDataTable from '@/components/IndicatorDataTable';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import HistogramChart from '@/components/HistogramChart';
import { generateMockData, mockTables, getIndicatorColumns } from '@/lib/mockData';

const Indicators = () => {
  const [selectedTable, setSelectedTable] = useState(mockTables[0]);
  const [selectedColumn, setSelectedColumn] = useState('MAX_REACT');
  const [data, setData] = useState<any[]>([]);
  const columns = getIndicatorColumns();
  const indicatorColumns = columns.filter(c => c !== 'timestamp');

  useEffect(() => {
    // Simulate loading data from selected table
    const mockData = generateMockData();
    setData(mockData);
  }, [selectedTable]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Indicators</h1>
        <p className="text-muted-foreground mt-1">Trading indicator analysis and visualization</p>
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-center bg-card p-4 rounded-lg border border-border">
        <TableSelector
          tables={mockTables}
          selectedTable={selectedTable}
          onTableChange={setSelectedTable}
        />
        <ColumnSelector
          columns={indicatorColumns}
          selectedColumn={selectedColumn}
          onColumnChange={setSelectedColumn}
        />
      </div>

      {/* Data Table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Data Preview</h2>
        <IndicatorDataTable
          data={data}
          columns={columns}
          selectedColumn={selectedColumn}
          onColumnChange={setSelectedColumn}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TimeSeriesChart data={data} selectedColumn={selectedColumn} />
        <HistogramChart data={data} selectedColumn={selectedColumn} />
      </div>
    </div>
  );
};

export default Indicators;
