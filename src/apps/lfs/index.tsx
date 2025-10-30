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
import { useDatasets, useDatasetFeatures, useDatasetTargets, useCreateLfsRun } from "@/lib/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const LfsDashboard = () => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | undefined>();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [lfsConfig, setLfsConfig] = useState({
    cases: 2000,
    maxKept: 15,
    iterations: 3,
    monteCarloTrials: 500,
    betaTrials: 20,
    maxThreads: 20,
    targetBins: 3,
  });
  const [results, setResults] = useState<any>(null);

  // API hooks
  const { data: datasetsResponse, isLoading: datasetsLoading } = useDatasets();
  const { data: featuresData, isLoading: featuresLoading } = useDatasetFeatures(selectedDatasetId || 0);
  const { data: targetsData, isLoading: targetsLoading } = useDatasetTargets(selectedDatasetId || 0);
  const createLfsMutation = useCreateLfsRun();

  const datasets = datasetsResponse || [];
  const features = (featuresData || []).filter(f => f.is_active).map(f => f.name);
  const targets = (targetsData || []).filter(t => t.is_active).map(t => t.name);

  const handleRunAnalysis = async () => {
    if (!selectedDatasetId || !selectedTarget || selectedFeatures.length === 0) {
      return;
    }

    try {
      const result = await createLfsMutation.mutateAsync({
        datasetId: selectedDatasetId,
        targetName: selectedTarget,
        featureNames: selectedFeatures,
        config: lfsConfig,
      });

      // Poll for results or display placeholder
      if (result?.results) {
        setResults(result.results);
      } else {
        // Show status
        setResults({
          status: result?.status || 'running',
          message: 'LFS analysis is running. Results will be available shortly.',
        });
      }
    } catch (error) {
      console.error('Failed to run LFS analysis:', error);
    }
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
                <Label htmlFor="dataset-select">Dataset</Label>
                {datasetsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedDatasetId?.toString()} onValueChange={(val) => setSelectedDatasetId(Number(val))}>
                    <SelectTrigger id="dataset-select">
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature and Target Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDatasetId ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a dataset first
                  </AlertDescription>
                </Alert>
              ) : featuresLoading || targetsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FeatureSelector
                    features={features}
                    selectedFeatures={selectedFeatures}
                    onSelectionChange={setSelectedFeatures}
                  />

                  <TargetSelector
                    targets={targets}
                    selectedTarget={selectedTarget}
                    onSelectionChange={setSelectedTarget}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <ParametersConfig />

          <Button
            className="w-full"
            size="lg"
            onClick={handleRunAnalysis}
            disabled={!selectedDatasetId || !selectedTarget || selectedFeatures.length === 0 || createLfsMutation.isPending}
          >
            <Play className="mr-2 h-5 w-5" />
            {createLfsMutation.isPending ? "Running Analysis..." : "Run LFS Analysis"}
          </Button>
        </div>

        {/* Results Panel */}
        <ResultsDisplay results={results} onClear={() => setResults(null)} />
      </div>
    </div>
  );
};

export default LfsDashboard;
