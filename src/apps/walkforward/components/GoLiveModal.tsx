import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Stage1RunDetail } from '@/lib/stage1/types';

interface GoLiveModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (indicatorScript: string) => void;
  run: Stage1RunDetail | null;
  isSubmitting: boolean;
}

export const GoLiveModal = ({ open, onClose, onSubmit, run, isSubmitting }: GoLiveModalProps) => {
  const [script, setScript] = useState('');

  useEffect(() => {
    if (!open) {
      setScript('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!run) return;
    onSubmit(script);
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
                <div className="text-muted-foreground">Features</div>
                <div className="font-mono text-xs line-clamp-2">{(run.feature_columns as any[]).join(', ')}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="indicator-script">Indicator Script (must include all run features)</Label>
              <Textarea
                id="indicator-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste the indicator script used for this run"
                className="h-40 font-mono text-xs"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!run || isSubmitting || !script.trim()}>
            {isSubmitting ? 'Going live…' : 'Go Live'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

