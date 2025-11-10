import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface FoldPerformance {
  fold: number;
  iter: number;
  signalsLong: number;
  signalsShort: number;
  signalsTotal: number;
  hitRateLong: number;
  hitRateShort: number;
  hitRateTotal: number;
  sum: number;
  running: number;
  pfTrain: number;
  pfLong: number;
  pfShort: number;
  pfDual: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
}

interface RunDetail {
  run: number;
  config: {
    model: string;
    dataSource: string;
    target: string;
    features: string[];
    trainSize: number;
    testSize: number;
    trainTestGap: number;
    stepSize: number;
    startFold: number;
    endFold: number;
    initialOffset: number;
    maxDepth: number;
    minChildWeight: number;
    learningRate: number;
    numRounds: number;
    earlyStopping: number;
    minRounds: number;
    subsample: number;
    colsampleBytree: number;
    lambda: number;
    forceMinimumTraining: boolean;
    objective: string;
    quantileAlpha: number;
    thresholdMethod: string;
  };
  folds: FoldPerformance[];
}

interface RunDetailsProps {
  runs: RunDetail[];
  activeRun: number;
  onRunChange: (run: number) => void;
  onCloseRun: (run: number) => void;
  onExamineFold: (run: number, fold: FoldPerformance) => void;
}

export const RunDetails = ({ runs, activeRun, onRunChange, onCloseRun, onExamineFold }: RunDetailsProps) => {
  const currentRun = runs.find((r) => r.run === activeRun);
  const colors = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"];
  const [configOpen, setConfigOpen] = useState(true);

  const copyFeatures = () => {
    if (currentRun) {
      const features = Array.isArray(currentRun.config.features)
        ? currentRun.config.features.join(", ")
        : "N/A";
      navigator.clipboard.writeText(features);
      toast({ title: "Features copied to clipboard" });
    }
  };

  const copyHyperparameters = () => {
    if (currentRun) {
      const params = `Learning Rate: ${currentRun.config.learningRate} | Max Depth: ${currentRun.config.maxDepth} | Boost Rounds: ${currentRun.config.numRounds}
Min Child Weight: ${currentRun.config.minChildWeight} | Subsample: ${currentRun.config.subsample} | ColSample: ${currentRun.config.colsampleBytree}
Lambda (L2): ${currentRun.config.lambda} | Early Stop: ${currentRun.config.earlyStopping} | Min Rounds: ${currentRun.config.minRounds}
Force Minimum Training: ${currentRun.config.forceMinimumTraining ? 'Yes' : 'No'} | Random Seed: 43
Objective: ${currentRun.config.objective} | Threshold: ${currentRun.config.thresholdMethod}`;
      navigator.clipboard.writeText(params);
      toast({ title: "Hyperparameters copied to clipboard" });
    }
  };

  const copyAll = () => {
    if (currentRun) {
      const featuresArray = Array.isArray(currentRun.config.features) ? currentRun.config.features : [];
      const all = `# Run ${currentRun.run} Configuration
Model: ${currentRun.config.model}

Features (${featuresArray.length}): [Copy Features button will copy these]
${featuresArray.join(", ")}

Target: ${currentRun.config.target}

Hyperparameters: [Copy Hyperparameters button will copy these]
Learning Rate: ${currentRun.config.learningRate} | Max Depth: ${currentRun.config.maxDepth} | Boost Rounds: ${currentRun.config.numRounds}
Min Child Weight: ${currentRun.config.minChildWeight} | Subsample: ${currentRun.config.subsample} | ColSample: ${currentRun.config.colsampleBytree}
Lambda (L2): ${currentRun.config.lambda} | Early Stop: ${currentRun.config.earlyStopping} | Min Rounds: ${currentRun.config.minRounds}
Force Minimum Training: ${currentRun.config.forceMinimumTraining ? 'Yes' : 'No'}
Objective: ${currentRun.config.objective} | Threshold: ${currentRun.config.thresholdMethod}`;
      navigator.clipboard.writeText(all);
      toast({ title: "Complete configuration copied to clipboard" });
    }
  };

  return (
    <Card className="p-4">
      <Tabs value={`run-${activeRun}`} onValueChange={(v) => onRunChange(parseInt(v.split("-")[1]))}>
        <TabsList className="mb-4">
          {runs.map((run, index) => (
            <TabsTrigger key={run.run} value={`run-${run.run}`} className="relative">
              <span 
                className="inline-block w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span>Run {run.run}</span>
              {runs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseRun(run.run);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {currentRun && (
          <TabsContent value={`run-${activeRun}`} className="space-y-4">
            {/* Configuration Summary */}
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <div className="rounded-lg border border-border bg-muted/30">
                <div className="w-full p-4 flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <h4 className="font-semibold">Configuration</h4>
                    {configOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyFeatures}>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy Features
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyHyperparameters}>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy Hyperparameters
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyAll}>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy All
                    </Button>
                  </div>
                </div>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 text-sm">
                    {/* Model */}
                    <div>
                      <span className="text-muted-foreground">Model:</span>{" "}
                      <span className="font-medium">{currentRun.config.model}</span>
                    </div>

                    {/* Features */}
                    <div>
                      <span className="text-muted-foreground">Features ({Array.isArray(currentRun.config.features) ? currentRun.config.features.length : 0}):</span>{" "}
                      <span className="font-mono text-xs">
                        {Array.isArray(currentRun.config.features) ? currentRun.config.features.join(" | ") : "N/A"}
                      </span>
                    </div>

                    {/* Target */}
                    <div>
                      <span className="text-muted-foreground">Target:</span>{" "}
                      <span className="font-medium">{currentRun.config.target}</span>
                    </div>

                    {/* Hyperparameters */}
                    <div>
                      <span className="text-muted-foreground font-semibold">Hyperparameters:</span>
                      <div className="mt-1 font-mono text-xs space-y-0.5">
                        <div>Learning Rate: {currentRun.config.learningRate} | Max Depth: {currentRun.config.maxDepth} | Boost Rounds: {currentRun.config.numRounds}</div>
                        <div>Min Child Weight: {currentRun.config.minChildWeight} | Subsample: {currentRun.config.subsample} | ColSample: {currentRun.config.colsampleBytree}</div>
                        <div>Lambda (L2): {currentRun.config.lambda} | Early Stop: {currentRun.config.earlyStopping} | Min Rounds: {currentRun.config.minRounds}</div>
                        <div>Force Minimum Training: {currentRun.config.forceMinimumTraining ? 'Yes' : 'No'} | Random Seed: 43</div>
                        <div>Objective: {currentRun.config.objective} {currentRun.config.objective === 'reg:quantileerror' && `(${currentRun.config.quantileAlpha})`} | Threshold: {currentRun.config.thresholdMethod}</div>
                      </div>
                    </div>

                    {/* Walk-Forward Config */}
                    <div>
                      <span className="text-muted-foreground font-semibold">Walk-Forward:</span>
                      <div className="mt-1 font-mono text-xs">
                        Train Size: {currentRun.config.trainSize} | Test Size: {currentRun.config.testSize} | Gap: {currentRun.config.trainTestGap} | Step: {currentRun.config.stepSize}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Fold-by-Fold Performance */}
            <div>
              <div className="mb-3">
                <h4 className="font-semibold">Fold-by-Fold Performance</h4>
              </div>
              <div className="rounded-lg border border-border bg-card/30 overflow-x-auto max-h-[440px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-center">Fold</TableHead>
                      <TableHead className="text-center">Iter</TableHead>
                      <TableHead className="text-center">S. Long</TableHead>
                      <TableHead className="text-center">S. Short</TableHead>
                      <TableHead className="text-center">S. Total</TableHead>
                      <TableHead className="text-center">H%Long</TableHead>
                      <TableHead className="text-center">H%Short</TableHead>
                      <TableHead className="text-center">H%Total</TableHead>
                      <TableHead className="text-center">Sum</TableHead>
                      <TableHead className="text-center">Running</TableHead>
                      <TableHead className="text-center">PF Train</TableHead>
                      <TableHead className="text-center">PF Long</TableHead>
                      <TableHead className="text-center">PF Short</TableHead>
                      <TableHead className="text-center">PF Dual</TableHead>
                      <TableHead className="text-center">Train</TableHead>
                      <TableHead className="text-center">Test</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRun.folds.map((fold) => (
                      <TableRow key={fold.fold} className="hover:bg-secondary/20">
                        <TableCell className="text-center font-medium">{fold.fold}</TableCell>
                        <TableCell className="text-center">{fold.iter}</TableCell>
                        <TableCell className="text-center">{fold.signalsLong > 0 ? fold.signalsLong : "–"}</TableCell>
                        <TableCell className="text-center">{fold.signalsShort > 0 ? fold.signalsShort : "–"}</TableCell>
                        <TableCell className="text-center">{fold.signalsTotal > 0 ? fold.signalsTotal : "–"}</TableCell>
                        <TableCell className="text-center">
                          {fold.hitRateLong > 0 ? `${fold.hitRateLong.toFixed(1)}%` : "–"}
                        </TableCell>
                        <TableCell className="text-center">
                          {fold.hitRateShort > 0 ? `${fold.hitRateShort.toFixed(1)}%` : "–"}
                        </TableCell>
                        <TableCell className="text-center">
                          {fold.hitRateTotal > 0 ? `${fold.hitRateTotal.toFixed(1)}%` : "–"}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${fold.sum > 0 ? "profit-text" : fold.sum < 0 ? "loss-text" : ""}`}>
                          {fold.sum !== 0 ? fold.sum.toFixed(6) : "–"}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${fold.running > 0 ? "profit-text" : fold.running < 0 ? "loss-text" : ""}`}>
                          {fold.running.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-center ${fold.pfTrain > 0 ? "profit-text" : fold.pfTrain < 0 ? "loss-text" : ""}`}>
                          {fold.pfTrain !== 0 ? fold.pfTrain.toFixed(2) : "–"}
                        </TableCell>
                        <TableCell className={`text-center ${fold.pfLong > 0 ? "profit-text" : fold.pfLong < 0 ? "loss-text" : ""}`}>
                          {fold.pfLong !== 0 ? fold.pfLong.toFixed(2) : "–"}
                        </TableCell>
                        <TableCell className={`text-center ${fold.pfShort > 0 ? "profit-text" : fold.pfShort < 0 ? "loss-text" : ""}`}>
                          {fold.pfShort !== 0 ? fold.pfShort.toFixed(2) : "–"}
                        </TableCell>
                        <TableCell className={`text-center ${fold.pfDual > 0 ? "profit-text" : fold.pfDual < 0 ? "loss-text" : ""}`}>
                          {fold.pfDual !== 0 ? fold.pfDual.toFixed(2) : "–"}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          [{fold.trainStart}, {(parseInt(fold.trainEnd) - 1).toString()}]
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          [{fold.testStart}, {(parseInt(fold.testEnd) - 1).toString()}]
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="default" 
                            size="sm"
                            className="h-7 px-3"
                            onClick={() => onExamineFold(currentRun.run, fold)}
                          >
                            Examine
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
};
