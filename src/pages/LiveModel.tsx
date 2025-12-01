import { ActiveModelCard } from '@/apps/walkforward/components/ActiveModelCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { GoLiveModal } from '@/apps/walkforward/components/GoLiveModal';
import { useRunsContext } from '@/contexts/RunsContext';
import { toast } from '@/hooks/use-toast';
import { useGoLive } from '@/hooks/useKrakenLive';

const LiveModelPage = () => {
  const { selectedRun } = useRunsContext?.() || { selectedRun: null } as any;
  const [modalOpen, setModalOpen] = useState(false);
  const goLiveMutation = useGoLive();

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
        <Button onClick={() => setModalOpen(true)} disabled={!selectedRun}>
          Go Live
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActiveModelCard />
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Select a saved run in Walkforward Pilot, then click Go Live to activate it on the GPU node.</p>
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
    </div>
  );
};

export default LiveModelPage;

