import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveModel } from '@/hooks/useKrakenLive';

export const ActiveModelCard = () => {
  const { data, isLoading, isError, error } = useActiveModel();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Live Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <Skeleton className="h-6 w-full" />}
        {isError && <div className="text-destructive">{error instanceof Error ? error.message : 'Failed to load active model'}</div>}
        {!isLoading && !isError && data && data.model_id && (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Model ID</span><span className="font-mono text-xs">{data.model_id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Feature Hash</span><span className="font-mono text-xs">{data.feature_hash ?? 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Thresholds</span><span>{data.short_threshold?.toFixed(4) ?? 'N/A'} / {data.long_threshold?.toFixed(4) ?? 'N/A'}</span></div>
            {data.best_score !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">Best Score</span><span>{data.best_score}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Trained</span><span>{data.trained_at_ms ? new Date(data.trained_at_ms).toLocaleString() : 'N/A'}</span></div>
          </>
        )}
        {!isLoading && !isError && (!data || !data.model_id) && (
          <div className="text-muted-foreground">No active model yet. Use Go Live to start.</div>
        )}
      </CardContent>
    </Card>
  );
};
