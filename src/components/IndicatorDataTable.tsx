import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface IndicatorDataTableProps {
  data: any[];
  columns: string[];
  selectedColumn: string;
  onColumnChange: (column: string) => void;
}

const IndicatorDataTable = ({ data, columns, selectedColumn, onColumnChange }: IndicatorDataTableProps) => {
  const displayData = data.slice(0, 10);

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return 'NaN';
      }
      return value.toFixed(6);
    }
    if (value === null || value === undefined) {
      return 'NaN';
    }
    return value;
  };

  return (
    <div className="border border-border rounded-md bg-card">
      <ScrollArea className="h-[320px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              {columns.map((column) => (
                <TableHead 
                  key={column} 
                  className={`text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    column === selectedColumn ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => column !== 'timestamp' && onColumnChange(column)}
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, idx) => (
              <TableRow key={idx} className="border-border hover:bg-secondary/50">
                {columns.map((column) => (
                  <TableCell 
                    key={column} 
                    className={`text-xs font-mono whitespace-nowrap ${
                      column === selectedColumn ? 'text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {formatValue(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        Showing 10 of {data.length} rows
      </div>
    </div>
  );
};

export default IndicatorDataTable;
