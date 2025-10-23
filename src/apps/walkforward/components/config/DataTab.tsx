import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface DataTabProps {
  target: string;
  onTargetChange: (value: string) => void;
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
}

const AVAILABLE_FEATURES = [
  "PRICE_MI", "R_PROD_MORLET", "VWMA_RATIO_M", "VWMA_RATIO_L", "ATR_RATIO_L",
  "ATR_RATIO_M", "VOL_MAX_PS", "BOL_WIDTH_S", "BOL_WIDTH_M", "BOL_WIDTH_L",
  "PV_FIT_M", "PV_FIT_L", "RSI_S", "RSI_M", "RSI_L", "MACD_HIST",
  "STOCH_K", "STOCH_D", "ADX_VAL", "CCI_VAL", "WILLR_VAL", "MFI_VAL",
];

const TARGETS = ["TGT_315", "TGT_150", "TGT_75", "TGT_30"];

export const DataTab = ({
  target,
  onTargetChange,
  selectedFeatures,
  onFeaturesChange,
}: DataTabProps) => {
  const [selectionMode, setSelectionMode] = useState<"manual" | "schedule">("manual");
  const [filterText, setFilterText] = useState("");
  const [scheduleText, setScheduleText] = useState("");

  const filteredFeatures = AVAILABLE_FEATURES.filter((f) =>
    f.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleFeatureToggle = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      onFeaturesChange(selectedFeatures.filter((f) => f !== feature));
    } else {
      onFeaturesChange([...selectedFeatures, feature]);
    }
  };

  const handleSelectAll = () => {
    onFeaturesChange([...AVAILABLE_FEATURES]);
  };

  const handleClearAll = () => {
    onFeaturesChange([]);
  };

  const handlePasteFeatures = () => {
    const features = scheduleText
      .split(/[\s,\n]+/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    onFeaturesChange(features);
    setSelectionMode("manual");
  };

  return (
    <div className="space-y-4">
      {/* Target Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Target</Label>
        <Select value={target} onValueChange={onTargetChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGETS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feature Selection Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-foreground">Feature Selection</Label>
        <RadioGroup value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual" className="font-medium cursor-pointer">
              Manual Selection
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="schedule" id="schedule" />
            <Label htmlFor="schedule" className="font-medium cursor-pointer">
              Use Feature Schedule
            </Label>
          </div>
        </RadioGroup>
      </div>

      {selectionMode === "manual" ? (
        <>
          {/* Filter and Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter features..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="flex-1"
              />
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                {selectedFeatures.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Feature List */}
          <ScrollArea className="h-64 border rounded-md p-3">
            <div className="space-y-2">
              {filteredFeatures.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature}
                    checked={selectedFeatures.includes(feature)}
                    onCheckedChange={() => handleFeatureToggle(feature)}
                  />
                  <Label
                    htmlFor={feature}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Paste Features (comma or space separated)</Label>
          <Textarea
            placeholder="PRICE_MI, R_PROD_MORLET, VWMA_RATIO_M..."
            value={scheduleText}
            onChange={(e) => setScheduleText(e.target.value)}
            className="h-48 font-mono text-xs"
          />
          <Button onClick={handlePasteFeatures} size="sm">
            Apply Features
          </Button>
        </div>
      )}
    </div>
  );
};
