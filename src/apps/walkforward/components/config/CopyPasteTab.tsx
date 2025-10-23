import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface CopyPasteTabProps {
  currentConfig: string;
  onPasteConfig: (config: string) => void;
}

export const CopyPasteTab = ({ currentConfig, onPasteConfig }: CopyPasteTabProps) => {
  const [configText, setConfigText] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(currentConfig);
    toast({
      title: "Configuration Copied",
      description: "Configuration has been copied to clipboard",
    });
  };

  const handlePaste = () => {
    onPasteConfig(configText);
    toast({
      title: "Configuration Applied",
      description: "Configuration has been parsed and applied",
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Current Configuration</Label>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            Copy to Clipboard
          </Button>
        </div>
        <Textarea
          value={currentConfig}
          readOnly
          className="h-64 font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label>Paste Configuration</Label>
        <Textarea
          placeholder="Paste configuration text here..."
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          className="h-48 font-mono text-xs"
        />
        <Button onClick={handlePaste} disabled={!configText.trim()}>
          Apply Configuration
        </Button>
      </div>
    </div>
  );
};
