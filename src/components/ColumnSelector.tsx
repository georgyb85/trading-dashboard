import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ColumnSelectorProps {
  columns: string[];
  selectedColumn: string;
  onColumnChange: (column: string) => void;
}

const ColumnSelector = ({ columns, selectedColumn, onColumnChange }: ColumnSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        Indicator Column:
      </label>
      <Select value={selectedColumn} onValueChange={onColumnChange}>
        <SelectTrigger className="w-[280px] bg-card border-border">
          <SelectValue placeholder="Select indicator column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ColumnSelector;
