import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import FeatureSelector from '@/apps/lfs/components/FeatureSelector';
import TargetSelector from '@/apps/lfs/components/TargetSelector';
import ParametersConfig from '@/apps/lfs/components/ParametersConfig';
import ResultsDisplay from '@/apps/lfs/components/ResultsDisplay';
import { useDatasets } from '@/lib/hooks/useApi';

const STATIC_FEATURES = [
  'ATR_RATIO_L', 'ATR_RATIO_M', 'ATR_RATIO_S', 'VOL_MAX_PS', 'R_PROD_MORLET',
  'VWMA_RATIO_M', 'PRICE_MI', 'VWMA_RATIO_L', 'BOL_WIDTH_M', 'BOL_WIDTH_S',
];

const STATIC_TARGETS = ['TGT_115', 'TGT_315', 'TGT_555'];

const LfsDashboard = () => {
  const { data: datasets, isLoading, error } = useDatasets();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | undefined>();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Local Feature Selection (Stage 1 Preview)</h1>
        <p className="text-muted-foreground text-sm">
          Stage 1 does not yet expose dedicated LFS API endpoints. The interface below allows you to stage configurations
          using static feature/target lists. Once backend support is added, these selectors will automatically switch to
          live dataset metadata.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load datasets: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Dataset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="dataset-select">Select dataset</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                  <SelectTrigger id="dataset-select">
                    <SelectValue placeholder={datasets && datasets.length > 0 ? 'Choose dataset' : 'No datasets available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(datasets ?? []).map((dataset) => (
                      <SelectItem key={dataset.dataset_id} value={dataset.dataset_id}>
                        {dataset.dataset_id.slice(0, 8)} – {dataset.questdb_tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature & Target Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDatasetId ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Select a dataset first to stage feature selection.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FeatureSelector
                    features={STATIC_FEATURES}
                    selectedFeatures={selectedFeatures}
                    onSelectionChange={setSelectedFeatures}
                  />
                  <TargetSelector
                    targets={STATIC_TARGETS}
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
            onClick={() =>
              setResults({
                status: 'pending_backend',
                message: 'LFS execution is not available in Stage 1. Configuration saved locally.',
                config: {
                  datasetId: selectedDatasetId,
                  target: selectedTarget,
                  features: selectedFeatures,
                },
              })
            }
            disabled={!selectedDatasetId || !selectedTarget || selectedFeatures.length === 0}
          >
            Save Configuration
          </Button>
        </div>

        <ResultsDisplay results={results} onClear={() => setResults(null)} />
      </div>
    </div>
  );
};

export default LfsDashboard;
