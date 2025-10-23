import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FeatureSelector from "@/apps/lfs/components/FeatureSelector";
import TargetSelector from "@/apps/lfs/components/TargetSelector";
import ParametersConfig from "@/apps/lfs/components/ParametersConfig";
import ResultsDisplay from "@/apps/lfs/components/ResultsDisplay";
import { Play, Database } from "lucide-react";

const LfsDashboard = () => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Mock data for demonstration
  const mockFeatures = [
    "ATR_RATIO_L", "ATR_RATIO_M", "ATR_RATIO_S", "FT110", "FT1L0M",
    "FT1M1NLP", "FTI_BEST_CRAT", "FTI_CRAT", "FTI_LARGEST", "FTI_MAJOR_LP",
    "REACTIVITY_L", "REACTIVITY_M", "REACTIVITY_S", "VOL_MAX_PS", "R_PROD_MORLET",
    "VWMA_RATIO_M", "PRICE_MI", "VWMA_RATIO_L", "BOL_WIDTH_M", "BOL_WIDTH_S"
  ];

  const mockTargets = ["TGT_115", "TGT_315", "TGT_555"];

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    setTimeout(() => {
      setResults({
        config: {
          features: selectedFeatures.length,
          target: selectedTarget,
          cases: 2000,
          maxKept: 15,
          iterations: 3,
          monteCarloTrials: 500,
          betaTrials: 20,
          maxThreads: 20,
          targetBins: 3
        },
        table: [
          { rank: 1, sig: "++", variable: "VOL_MAX_PS", pct: 50.0, soloPValue: 0.0909, unbiasedPValue: 0.0909 },
          { rank: 2, sig: "++", variable: "R_PROD_MORLET", pct: 35.5, soloPValue: 0.0909, unbiasedPValue: 0.2727 },
          { rank: 3, sig: "++", variable: "VOL_MIN_PS", pct: 28.45, soloPValue: 0.5455, unbiasedPValue: 0.7273 },
          { rank: 4, sig: "++", variable: "VWMA_RATIO_M", pct: 27.6, soloPValue: 0.0909, unbiasedPValue: 0.7273 },
          { rank: 5, sig: "++", variable: "PRICE_MI", pct: 26.95, soloPValue: 0.0909, unbiasedPValue: 0.7273 }
        ],
        summary: {
          highlySignificant: 0,
          significant: 16,
          marginal: 13,
          noise: 89
        },
        recommendations: [
          "VOL_MAX_PS", "R_PROD_MORLET", "VWMA_RATIO_M", 
          "PRICE_MI", "VWMA_RATIO_L", "BOL_WIDTH_M",
          "BOL_WIDTH_S", "PV_FIT_M", "BOL_WIDTH_L", "ATR_RATIO_L"
        ],
        cautions: [
          { feature: "VOL_MIN_PS", pct: 28, pValue: 0.545 },
          { feature: "RES_MIN_ADX", pct: 22, pValue: 0.454 }
        ]
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Local Feature Selection (LFS)</h1>
        <p className="text-muted-foreground">Monte-Carlo Permutation Test for Feature Selection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="table-select">QuestDB Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger id="table-select">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_data">market_data</SelectItem>
                    <SelectItem value="trading_features">trading_features</SelectItem>
                    <SelectItem value="price_history">price_history</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature and Target Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <FeatureSelector
                  features={mockFeatures}
                  selectedFeatures={selectedFeatures}
                  onSelectionChange={setSelectedFeatures}
                />
                
                <TargetSelector
                  targets={mockTargets}
                  selectedTarget={selectedTarget}
                  onSelectionChange={setSelectedTarget}
                />
              </div>
            </CardContent>
          </Card>

          <ParametersConfig />

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleRunAnalysis}
            disabled={!selectedTarget || selectedFeatures.length === 0 || isAnalyzing}
          >
            <Play className="mr-2 h-5 w-5" />
            {isAnalyzing ? "Running Analysis..." : "Run LFS Analysis"}
          </Button>
        </div>

        {/* Results Panel */}
        <ResultsDisplay results={results} onClear={() => setResults(null)} />
      </div>
    </div>
  );
};

export default LfsDashboard;
