import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckSquare, Square } from "lucide-react";

interface FeatureSelectorProps {
  features: string[];
  selectedFeatures: string[];
  onSelectionChange: (features: string[]) => void;
}

const FeatureSelector = ({ features, selectedFeatures, onSelectionChange }: FeatureSelectorProps) => {
  const [filter, setFilter] = useState("");

  const filteredFeatures = features.filter(feature => 
    feature.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSelectAll = () => {
    onSelectionChange(filteredFeatures);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleToggle = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      onSelectionChange(selectedFeatures.filter(f => f !== feature));
    } else {
      onSelectionChange([...selectedFeatures, feature]);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Feature Selection</Label>
      
      <div className="flex gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleSelectAll}
          className="flex-1"
        >
          <CheckSquare className="h-4 w-4 mr-1" />
          Select All
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleClearAll}
          className="flex-1"
        >
          <Square className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter features..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[120px] border rounded-md p-2 bg-muted/30">
        <div className="space-y-2">
          {filteredFeatures.map((feature) => (
            <div key={feature} className="flex items-center space-x-2">
              <Checkbox
                id={`feature-${feature}`}
                checked={selectedFeatures.includes(feature)}
                onCheckedChange={() => handleToggle(feature)}
              />
              <label
                htmlFor={`feature-${feature}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {feature}
              </label>
            </div>
          ))}
        </div>
      </ScrollArea>

      <p className="text-sm text-muted-foreground">
        Selected: {selectedFeatures.length} features
      </p>
    </div>
  );
};

export default FeatureSelector;
