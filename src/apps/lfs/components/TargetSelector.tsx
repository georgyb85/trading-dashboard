import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

interface TargetSelectorProps {
  targets: string[];
  selectedTarget: string;
  onSelectionChange: (target: string) => void;
}

const TargetSelector = ({ targets, selectedTarget, onSelectionChange }: TargetSelectorProps) => {
  const [filter, setFilter] = useState("");

  const filteredTargets = targets.filter(target => 
    target.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <Label>Target Selection</Label>

      {/* Spacer to align with feature selector buttons */}
      <div className="h-8" />

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter targets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[120px] border rounded-md p-2 bg-muted/30">
        <RadioGroup value={selectedTarget} onValueChange={onSelectionChange}>
          <div className="space-y-2">
            {filteredTargets.map((target) => (
              <div key={target} className="flex items-center space-x-2">
                <RadioGroupItem value={target} id={`target-${target}`} />
                <Label
                  htmlFor={`target-${target}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {target}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </ScrollArea>

      <p className="text-sm text-muted-foreground">
        Target: {selectedTarget || "None selected"}
      </p>
    </div>
  );
};

export default TargetSelector;
