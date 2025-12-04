import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAvailableFeatures } from '@/hooks/useKrakenLive';
import type { Stage1RunDetail } from '@/lib/stage1/types';

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  run: Stage1RunDetail | null;
  isSubmitting: boolean;
}

export const GoLiveModal = ({ open, onClose, onSubmit, run, isSubmitting }: GoLiveModalProps) => {
  const { data: featuresData, isLoading: featuresLoading, error: featuresError } = useAvailableFeatures();

  // Normalize feature hash to string for safe display
  const featureHashText = useMemo(() => {
    const raw = featuresData?.feature_hash;
    if (raw === undefined || raw === null) return undefined;
    return typeof raw === 'string' ? raw : String(raw);
  }, [featuresData?.feature_hash]);

  const runFeatures = useMemo(() => {
    if (!run) return [];
    if (Array.isArray(run.feature_columns)) return run.feature_columns;
    if (typeof run.feature_columns === 'string') return run.feature_columns.split(',').map((f) => f.trim());
    return [];
  }, [run]);

  const validation = useMemo(() => {
    if (!featuresData || !run) return { valid: false, missing: [], available: [] };

    const availableSet = new Set(featuresData.features || []);
    const missing = runFeatures.filter((f) => !availableSet.has(f));

    return {
      valid: missing.length === 0,
      missing,
      available: featuresData.features || [],
    };
  }, [featuresData, run, runFeatures]);

  const handleSubmit = () => {
    if (!run || !validation.valid) return;
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Go Live with Saved Run</DialogTitle>
        </DialogHeader>
        {!run ? (
          <p className="text-sm text-muted-foreground">Select a run first.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Run ID</div>
                <div className="font-mono text-xs">{run.run_id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Dataset</div>
                <div className="font-mono text-xs">{run.dataset_id}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Target</div>
                <div className="font-mono text-xs">{String(run.target_column)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Features ({runFeatures.length})</div>
                <div className="font-mono text-xs line-clamp-2">{runFeatures.join(', ')}</div>
              </div>
            </div>

            {featuresLoading && (
              <div className="text-sm text-muted-foreground">Loading available features...</div>
            )}

            {featuresError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load available features. Ensure the backend trading pipeline is running.
                </AlertDescription>
              </Alert>
            )}

            {featuresData && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Available Features: </span>
                  <span className="font-mono text-xs">{featuresData.features.length} available</span>
                  {featureHashText && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      (hash: {featureHashText.slice(0, 8)})
                    </span>
                  )}
                </div>

                {validation.valid ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      All {runFeatures.length} run features are available in the live indicator buffer.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Missing features ({validation.missing.length}):</div>
                      <div className="font-mono text-xs mt-1">{validation.missing.join(', ')}</div>
                      <div className="mt-2 text-xs">
                        Update the indicator script (live_trading.indicator_script in config) to include these features.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!run || isSubmitting || featuresLoading || !validation.valid}
          >
            {isSubmitting ? 'Going live…' : 'Go Live'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
