import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TableSelectorProps {
  tables: string[];
  selectedTable: string;
  onTableChange: (table: string) => void;
}

const TableSelector = ({ tables, selectedTable, onTableChange }: TableSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        QuestDB Table:
      </label>
      <Select value={selectedTable} onValueChange={onTableChange}>
        <SelectTrigger className="w-[280px] bg-card border-border">
          <SelectValue placeholder="Select table" />
        </SelectTrigger>
        <SelectContent>
          {tables.map((table) => (
            <SelectItem key={table} value={table}>
              {table}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TableSelector;
