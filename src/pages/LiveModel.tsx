import { ActiveModelCard } from '@/apps/walkforward/components/ActiveModelCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { GoLiveModal } from '@/apps/walkforward/components/GoLiveModal';
import { useRunsContext } from '@/contexts/RunsContext';
import { toast } from '@/hooks/use-toast';
import { useGoLive } from '@/hooks/useKrakenLive';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LiveModelPage = () => {
  const { cachedRuns } = useRunsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const goLiveMutation = useGoLive();

  const runList = useMemo(() => Array.from(cachedRuns.values()), [cachedRuns]);
  const selectedRun = runList.find((r) => r.run_id === selectedRunId) || null;

  useEffect(() => {
    if (runList.length > 0 && !selectedRunId) {
      setSelectedRunId(runList[0].run_id);
    }
    if (runList.length === 0) {
      setSelectedRunId('');
    }
  }, [runList, selectedRunId]);

  const handleGoLive = (script: string) => {
    if (!selectedRun) {
      toast({ title: 'No run selected', description: 'Load a run from Walkforward first', variant: 'destructive' });
      return;
    }
    goLiveMutation.mutate({ run_id: selectedRun.run_id, indicator_script: script });
    setModalOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Live Model</h1>
          <p className="text-sm text-muted-foreground">Activate and monitor the current live model.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedRunId}
            onValueChange={(value) => setSelectedRunId(value)}
            disabled={runList.length === 0}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={runList.length === 0 ? 'Load a run in Walkforward' : 'Select run'} />
            </SelectTrigger>
            <SelectContent>
              {runList.map((run) => (
                <SelectItem key={run.run_id} value={run.run_id}>
                  {run.run_id.slice(0, 8)}… ({run.dataset_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setModalOpen(true)} disabled={!selectedRun}>
          Go Live
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActiveModelCard />
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Load a run in Walkforward Pilot first; it will appear in the selector above.</p>
            <p>Select the run, click Go Live, and provide the indicator script that matches the run’s features.</p>
            <p>Ensure the indicator script matches the run’s features; the backend will reject mismatches.</p>
          </CardContent>
        </Card>
      </div>

      <GoLiveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleGoLive}
        run={selectedRun}
        isSubmitting={goLiveMutation.isPending}
      />
      {runList.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No runs cached yet. Load a saved run from the Walkforward Pilot to enable Go Live.
        </div>
      )}
    </div>
  );
};

export default LiveModelPage;
