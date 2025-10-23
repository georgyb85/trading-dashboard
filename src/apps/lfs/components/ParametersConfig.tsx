import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings } from "lucide-react";

const ParametersConfig = () => {
  const [params, setParams] = useState({
    maxKept: 15,
    iterations: 3,
    monteCarloTrials: 500,
    betaTrials: 20,
    maxThreads: 20,
    targetBins: 3,
    startRow: 0,
    endRow: 2000,
    mcptReplications: 10,
    mcptType: "complete",
    solver: "legacy",
    enableCuda: true
  });

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          LFS Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="maxKept" className="text-sm">Max Variables Kept</Label>
            <Input
              id="maxKept"
              type="number"
              value={params.maxKept}
              onChange={(e) => updateParam("maxKept", parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="iterations" className="text-sm">Iterations</Label>
            <Input
              id="iterations"
              type="number"
              value={params.iterations}
              onChange={(e) => updateParam("iterations", parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="monteCarloTrials" className="text-sm">Monte-Carlo Trials</Label>
            <Input
              id="monteCarloTrials"
              type="number"
              value={params.monteCarloTrials}
              onChange={(e) => updateParam("monteCarloTrials", parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="betaTrials" className="text-sm">Beta Trials</Label>
            <Input
              id="betaTrials"
              type="number"
              value={params.betaTrials}
              onChange={(e) => updateParam("betaTrials", parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="maxThreads" className="text-sm">Max Threads</Label>
            <Input
              id="maxThreads"
              type="number"
              value={params.maxThreads}
              onChange={(e) => updateParam("maxThreads", parseInt(e.target.value))}
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="targetBins" className="text-sm">Target Bins</Label>
            <Input
              id="targetBins"
              type="number"
              value={params.targetBins}
              onChange={(e) => updateParam("targetBins", parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">Data Range</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startRow" className="text-xs">Start Row</Label>
              <Input
                id="startRow"
                type="number"
                value={params.startRow}
                onChange={(e) => updateParam("startRow", parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="endRow" className="text-xs">End Row</Label>
              <Input
                id="endRow"
                type="number"
                value={params.endRow}
                onChange={(e) => updateParam("endRow", parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-sm">MCPT Configuration</Label>
          
          <div className="space-y-1">
            <Label htmlFor="mcptReplications" className="text-xs">MCPT Replications</Label>
            <Input
              id="mcptReplications"
              type="number"
              value={params.mcptReplications}
              onChange={(e) => updateParam("mcptReplications", parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">MCPT Type</Label>
            <RadioGroup 
              value={params.mcptType} 
              onValueChange={(value) => updateParam("mcptType", value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="mcpt-none" />
                <Label htmlFor="mcpt-none" className="text-sm cursor-pointer">None</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="complete" id="mcpt-complete" />
                <Label htmlFor="mcpt-complete" className="text-sm cursor-pointer">Complete</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cyclic" id="mcpt-cyclic" />
                <Label htmlFor="mcpt-cyclic" className="text-sm cursor-pointer">Cyclic</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Solver</Label>
            <RadioGroup 
              value={params.solver} 
              onValueChange={(value) => updateParam("solver", value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="legacy" id="solver-legacy" />
                <Label htmlFor="solver-legacy" className="text-sm cursor-pointer">Legacy (Original)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highs" id="solver-highs" />
                <Label htmlFor="solver-highs" className="text-sm cursor-pointer">HiGHS (Modern)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="enableCuda" 
              checked={params.enableCuda}
              onCheckedChange={(checked) => updateParam("enableCuda", checked)}
            />
            <Label htmlFor="enableCuda" className="text-sm cursor-pointer">
              Enable CUDA
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParametersConfig;
