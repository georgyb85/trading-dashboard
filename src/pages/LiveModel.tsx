import { FoldResults } from '@/apps/walkforward/components/FoldResults';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { GoLiveModal } from '@/apps/walkforward/components/GoLiveModal';
import { useRunsContext } from '@/contexts/RunsContext';
import { toast } from '@/hooks/use-toast';
import {
  useGoLive,
  useActiveModel,
  useLiveModels,
  useActivateModel,
  useDeactivateModel,
  useDeleteModel,
  useUpdateThresholds,
  useAttachExecutor,
  useUpdateExecutor,
  useDetachExecutor,
} from '@/hooks/useKrakenLive';
import type { XGBoostTrainResult } from '@/lib/types/xgboost';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  BarChart3,
  Settings,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Target,
  TrendingUp,
  Play,
  Pause,
  Trash2,
  Link,
  Unlink,
  Eye,
  Cpu,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  X,
  Rocket,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts';
import { krakenClient } from '@/lib/kraken/client';
import { Input } from '@/components/ui/input';
import { useMarketDataContext } from '@/contexts/MarketDataContext';
import { Stage1ExecutorBindingModal } from '@/components/Stage1ExecutorBindingModal';
import type { LiveModelSummary } from '@/lib/kraken/types';
import type { Stage1ExecutorBindingUpsertRequest } from '@/lib/stage1/types';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL CARD COMPONENT - Refined trading terminal aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

interface ModelCardProps {
  model: LiveModelSummary;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onAttachExecutor: () => void;
  onConfigExecutor: () => void;
  onDetachExecutor: () => void;
  isPending: boolean;
}

// Format next retrain time from API (next UTC midnight)
const getNextRetrainDisplay = (nextRetrainMs: number | undefined): { label: string; isOverdue: boolean; utcTime: string } => {
  if (!nextRetrainMs) return { label: 'Unknown', isOverdue: false, utcTime: '' };

  const now = Date.now();
  const diff = nextRetrainMs - now;
  const utcTime = new Date(nextRetrainMs).toUTCString().replace(' GMT', ' UTC');

  if (diff < 0) {
    const hoursOverdue = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    return { label: `${hoursOverdue}h overdue`, isOverdue: true, utcTime };
  }

  const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
  const minsUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursUntil > 0) {
    return { label: `${hoursUntil}h ${minsUntil}m`, isOverdue: false, utcTime };
  }
  return { label: `${minsUntil}m`, isOverdue: false, utcTime };
};

const ModelCard = ({
  model,
  isSelected,
  isActive,
  onSelect,
  onActivate,
  onDeactivate,
  onDelete,
  onAttachExecutor,
  onConfigExecutor,
  onDetachExecutor,
  isPending,
}: ModelCardProps) => {
  const executorStatus = model.has_executor
    ? model.executor_enabled
      ? { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', label: 'LIVE TRADING', icon: Zap, glow: 'shadow-emerald-500/20' }
      : { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', label: 'PAUSED', icon: Pause, glow: '' }
    : { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'PREDICT ONLY', icon: Eye, glow: '' };

  const ExecutorIcon = executorStatus.icon;
  const nextRetrain = getNextRetrainDisplay(model.next_retrain_ms);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative group cursor-pointer transition-all duration-300 ease-out',
        'rounded-xl border-2 bg-gradient-to-br from-card via-card to-card/80',
        'p-4 min-w-0',
        model.status === 'active'
          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'border-border/40 hover:border-border/60',
        isSelected
          ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background scale-[1.02]'
          : 'hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20'
      )}
    >
      {/* Header: Model ID + Status Badge */}
      <div className="flex items-start justify-between gap-3 mb-4 pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          {model.status === 'active' && (
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          )}
          <div className="min-w-0">
            <span className="font-mono text-sm font-bold tracking-wide block truncate">
              {model.model_id.slice(0, 10).toUpperCase()}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide truncate block">
              {model.dataset_id}
            </span>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider flex-shrink-0',
          'border transition-all',
          executorStatus.bg, executorStatus.color, executorStatus.border,
          executorStatus.glow && `shadow-lg ${executorStatus.glow}`
        )}>
          <ExecutorIcon className="h-3 w-3" />
          <span>{executorStatus.label}</span>
        </div>
      </div>

      {/* Model Info Row */}
      <div className="flex items-center gap-2 mb-3 text-[10px] text-muted-foreground">
        <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">v{model.version}</span>
        {model.feature_hash && (
          <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={`Feature hash: ${model.feature_hash}`}>
            #{model.feature_hash.slice(0, 8)}
          </span>
        )}
        {model.target_horizon_bars !== undefined && model.target_horizon_bars > 0 && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded">{model.target_horizon_bars}bar</span>
        )}
        {model.best_score !== undefined && (
          <span className="bg-muted/50 px-1.5 py-0.5 rounded" title="Best CV Score">
            {model.best_score.toFixed(4)}
          </span>
        )}
      </div>

      {/* Training Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Trained At */}
        <div className="p-2.5 rounded-lg bg-muted/50 border border-border/30">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Trained</span>
          </div>
          <div className="font-mono text-xs font-medium">
            {model.trained_at_ms
              ? new Date(model.trained_at_ms).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '—'}
          </div>
        </div>

        {/* Next Retrain */}
        <div
          className={cn(
            'p-2.5 rounded-lg border',
            nextRetrain.isOverdue
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-muted/50 border-border/30'
          )}
          title={nextRetrain.utcTime ? `Next retrain: ${nextRetrain.utcTime}` : undefined}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw className={cn('h-3 w-3', nextRetrain.isOverdue ? 'text-red-400' : 'text-muted-foreground')} />
            <span className={cn(
              'text-[9px] uppercase tracking-widest font-semibold',
              nextRetrain.isOverdue ? 'text-red-400' : 'text-muted-foreground'
            )}>Retrain In</span>
          </div>
          <div className={cn(
            'font-mono text-xs font-medium',
            nextRetrain.isOverdue ? 'text-red-400' : ''
          )}>
            {nextRetrain.label}
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/30">
        {/* Activate/Deactivate Toggle */}
        {model.status === 'active' ? (
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              'bg-amber-500/10 text-amber-400 border border-amber-500/30',
              'hover:bg-amber-500/20 hover:border-amber-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={(e) => { e.stopPropagation(); onDeactivate(); }}
            disabled={isPending}
            title="Deactivate Model"
          >
            <Pause className="h-3.5 w-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
              'hover:bg-emerald-500/20 hover:border-emerald-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            onClick={(e) => { e.stopPropagation(); onActivate(); }}
            disabled={isPending}
            title="Activate Model"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Activate</span>
          </button>
        )}

        {/* Executor Button - PROMINENT */}
        {model.has_executor ? (
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex-1 justify-center',
              'bg-primary/10 text-primary border border-primary/30',
              'hover:bg-primary/20 hover:border-primary/50'
            )}
            onClick={(e) => { e.stopPropagation(); onConfigExecutor(); }}
            title="Configure Executor"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Configure</span>
          </button>
        ) : (
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex-1 justify-center',
              'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
              'hover:from-primary/90 hover:to-primary/70 hover:shadow-lg hover:shadow-primary/25',
              'border border-primary/50'
            )}
            onClick={(e) => { e.stopPropagation(); onAttachExecutor(); }}
            title="Attach Executor for Live Trading"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Attach Executor</span>
          </button>
        )}

        {/* Delete - subtle */}
        <button
          className={cn(
            'p-1.5 rounded-md transition-all',
            'text-muted-foreground hover:text-red-400',
            'hover:bg-red-500/10 border border-transparent hover:border-red-500/30'
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete model ${model.model_id.slice(0, 8)}…?`)) onDelete();
          }}
          title="Delete Model"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

const CollapsibleSection = ({ title, icon: Icon, defaultOpen = true, children, badge, actions }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold tracking-tight">{title}</span>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      <div className={cn('transition-all duration-300 ease-in-out', isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden')}>
        <div className="px-5 pb-5 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

const StatCard = ({ label, value, subValue, trend, colorClass }: StatCardProps) => {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground';

  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{label}</div>
      <div className={cn('text-xl font-mono font-bold tracking-tight', colorClass || 'text-foreground')}>
        {value}
      </div>
      {(subValue || trend) && (
        <div className="flex items-center gap-1 mt-0.5">
          {trend && <TrendIcon className={cn('h-3 w-3', trendColor)} />}
          {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL DETAIL PANEL - Tabbed interface for selected model
// ═══════════════════════════════════════════════════════════════════════════════

type DetailTab = 'performance' | 'predictions' | 'config';

interface ModelDetailPanelProps {
  model: LiveModelSummary;
  metricsQuery: any;
  metricsError: string | null;
  trainResult: any;
  combinedPredictions: any[];
  horizonBars: number;
  targetColumnName: string | null;
  extractedTargetsByKey: Map<string, number>;
  maturedTargetsByStreamTs: Map<string, number>;
  longThresholdInput: string;
  shortThresholdInput: string;
  setLongThresholdInput: (v: string) => void;
  setShortThresholdInput: (v: string) => void;
  updateThresholds: any;
  metricsModelId: string | null;
  onClose: () => void;
}

const ModelDetailPanel = ({
  model,
  metricsQuery,
  metricsError,
  trainResult,
  combinedPredictions,
  horizonBars,
  targetColumnName,
  extractedTargetsByKey,
  maturedTargetsByStreamTs,
  longThresholdInput,
  shortThresholdInput,
  setLongThresholdInput,
  setShortThresholdInput,
  updateThresholds,
  metricsModelId,
  onClose,
}: ModelDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('performance');
  const [signalType, setSignalType] = useState<'optimal' | 'percentile' | 'zero'>('optimal');

  const tabs: { id: DetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'predictions', label: 'Predictions', icon: Activity },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  const nextRetrain = getNextRetrainDisplay(model.next_retrain_ms);

  return (
    <div className="border-t border-border/50 bg-gradient-to-b from-card/50 to-background">
      {/* Panel Header */}
      <div className="border-b border-border/30 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Model Identity */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {model.status === 'active' && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                )}
                <div>
                  <h2 className="font-mono text-lg font-bold tracking-wide">
                    {model.model_id.slice(0, 12).toUpperCase()}
                  </h2>
                  <p className="text-xs text-muted-foreground">{model.dataset_id}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 pl-4 border-l border-border/30">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Version</div>
                  <div className="font-mono text-xs font-medium">v{model.version}</div>
                </div>
                {model.feature_hash && (
                  <div className="text-center" title={`Feature hash: ${model.feature_hash}`}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hash</div>
                    <div className="font-mono text-xs font-medium">#{model.feature_hash.slice(0, 8)}</div>
                  </div>
                )}
                {model.target_horizon_bars !== undefined && model.target_horizon_bars > 0 && (
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horizon</div>
                    <div className="font-mono text-xs font-medium">{model.target_horizon_bars} bars</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trained</div>
                  <div className="font-mono text-xs font-medium">
                    {model.trained_at_ms
                      ? new Date(model.trained_at_ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                </div>
                <div className="text-center" title={nextRetrain.utcTime ? `Next retrain: ${nextRetrain.utcTime}` : undefined}>
                  <div className={cn('text-[10px] uppercase tracking-wider', nextRetrain.isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
                    Retrain In
                  </div>
                  <div className={cn('font-mono text-xs font-medium', nextRetrain.isOverdue ? 'text-red-400' : '')}>
                    {nextRetrain.label}
                  </div>
                </div>
                {model.has_executor && (
                  <Badge variant={model.executor_enabled ? 'default' : 'secondary'} className="text-xs">
                    {model.executor_enabled ? 'Trading Active' : 'Executor Paused'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => metricsQuery.refetch()}
                disabled={metricsQuery.isFetching}
              >
                {metricsQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap',
                    'border-b-2 -mb-[2px]',
                    activeTab === tab.id
                      ? 'bg-background border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* PERFORMANCE TAB - Merged Overview + Charts */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Live Metrics */}
            {metricsError ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                {metricsError}
              </div>
            ) : metricsQuery.data?.live_metrics ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Live Metrics
                  {metricsQuery.data.live_metrics.sample_count && (
                    <Badge variant="secondary" className="ml-2 text-xs font-mono">
                      {metricsQuery.data.live_metrics.sample_count} samples
                    </Badge>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Directional Accuracy"
                    value={metricsQuery.data.live_metrics.directional_accuracy != null
                      ? `${(metricsQuery.data.live_metrics.directional_accuracy * 100).toFixed(1)}%`
                      : 'N/A'}
                    colorClass={metricsQuery.data.live_metrics.directional_accuracy > 0.5 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <StatCard
                    label="ROC AUC"
                    value={metricsQuery.data.live_metrics.roc_auc != null && metricsQuery.data.live_metrics.roc_auc >= 0
                      ? metricsQuery.data.live_metrics.roc_auc.toFixed(3)
                      : 'N/A'}
                    subValue="Mann-Whitney"
                    colorClass="text-primary"
                  />
                  <StatCard label="MAE" value={metricsQuery.data.live_metrics.mae != null ? metricsQuery.data.live_metrics.mae.toFixed(4) : 'N/A'} />
                  <StatCard label="R²" value={metricsQuery.data.live_metrics.r2 != null ? metricsQuery.data.live_metrics.r2.toFixed(4) : 'N/A'} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg">
                <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium">No live metrics available yet</p>
                <p className="text-xs mt-1">Metrics appear after predictions mature</p>
              </div>
            )}

            {/* Charts - FoldResults */}
            <div className="pt-4 border-t border-border/30">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                Visualizations
              </h3>
              {trainResult ? (
                <FoldResults
                  result={trainResult}
                  isLoading={metricsQuery.isFetching}
                  loadingMessage="Loading model metrics…"
                  error={metricsError}
                  liveMetrics={metricsQuery.data?.live_metrics}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                  <p className="font-medium">No visualization data available</p>
                  <p className="text-xs mt-1">Charts appear after model deployment</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PREDICTIONS TAB */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            {/* Header with Signal Type Selector */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Prediction History
                {horizonBars > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">({horizonBars} bar horizon)</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {/* Signal Type Selector */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border/50">
                  <button
                    onClick={() => setSignalType('optimal')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      signalType === 'optimal'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Optimal ROC
                  </button>
                  <button
                    onClick={() => setSignalType('percentile')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      signalType === 'percentile'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Percentile
                  </button>
                  <button
                    onClick={() => setSignalType('zero')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                      signalType === 'zero'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Zero Cross
                  </button>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {combinedPredictions.length} predictions
                </Badge>
              </div>
            </div>

            {/* Prediction History Chart */}
            {combinedPredictions.length > 0 && (
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={combinedPredictions.slice(0, 50).reverse().map((p) => {
                      const thresholds = trainResult?.thresholds;
                      let longTh: number | undefined;
                      let shortTh: number | undefined;

                      if (signalType === 'zero') {
                        longTh = 0;
                        shortTh = 0;
                      } else if (signalType === 'percentile') {
                        longTh = thresholds?.long_percentile_95;
                        shortTh = thresholds?.short_percentile_05;
                      } else {
                        longTh = thresholds?.long_optimal ?? p.longThreshold;
                        shortTh = thresholds?.short_optimal ?? p.shortThreshold;
                      }

                      return {
                        time: new Date(p.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        prediction: p.prediction,
                        longThreshold: longTh,
                        shortThreshold: shortTh,
                      };
                    })}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => v.toFixed(4)}
                      domain={['auto', 'auto']}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [value.toFixed(6), 'Prediction']}
                    />
                    {/* Threshold reference lines */}
                    {signalType !== 'zero' && trainResult?.thresholds && (
                      <>
                        <ReferenceLine
                          y={signalType === 'percentile'
                            ? trainResult.thresholds.long_percentile_95
                            : trainResult.thresholds.long_optimal}
                          stroke="hsl(142.1 76.2% 36.3%)"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                        />
                        <ReferenceLine
                          y={signalType === 'percentile'
                            ? trainResult.thresholds.short_percentile_05
                            : trainResult.thresholds.short_optimal}
                          stroke="hsl(346.8 77.2% 49.8%)"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                        />
                      </>
                    )}
                    {signalType === 'zero' && (
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="prediction"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 2, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-primary rounded" />
                    <span className="text-muted-foreground">Prediction</span>
                  </div>
                  {signalType !== 'zero' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-emerald-500 rounded" style={{ borderStyle: 'dashed' }} />
                        <span className="text-muted-foreground">Long Threshold</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-red-500 rounded" />
                        <span className="text-muted-foreground">Short Threshold</span>
                      </div>
                    </>
                  )}
                  {signalType === 'zero' && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-muted-foreground rounded" />
                      <span className="text-muted-foreground">Zero Line</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Predictions Table */}
            {combinedPredictions.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 bg-muted/30">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Time</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Prediction</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Actual</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Signal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {combinedPredictions.slice(0, 25).map((p) => {
                      const actual =
                        p.actual ??
                        (targetColumnName ? extractedTargetsByKey.get(`${p.streamId}:${targetColumnName}:${p.ts}`) : undefined) ??
                        maturedTargetsByStreamTs.get(`${p.streamId}:${p.ts}`) ??
                        null;

                      // Get thresholds from trainResult based on signal type
                      const thresholds = trainResult?.thresholds;
                      let signal: 'LONG' | 'SHORT' | null = null;

                      if (signalType === 'zero') {
                        // Zero-crossover: >0 = LONG, <0 = SHORT
                        if (p.prediction > 0) signal = 'LONG';
                        else if (p.prediction < 0) signal = 'SHORT';
                      } else if (signalType === 'percentile') {
                        // Percentile: use P95/P5 thresholds
                        const longTh = thresholds?.long_percentile_95;
                        const shortTh = thresholds?.short_percentile_05;
                        if (longTh !== undefined && p.prediction > longTh) signal = 'LONG';
                        else if (shortTh !== undefined && p.prediction < shortTh) signal = 'SHORT';
                      } else {
                        // Optimal ROC: use optimal thresholds (fallback to prediction thresholds)
                        const longTh = thresholds?.long_optimal ?? p.longThreshold;
                        const shortTh = thresholds?.short_optimal ?? p.shortThreshold;
                        if (longTh !== undefined && p.prediction > longTh) signal = 'LONG';
                        else if (shortTh !== undefined && p.prediction < shortTh) signal = 'SHORT';
                      }

                      return (
                        <TableRow key={`${p.modelId}-${p.ts}`} className="border-border/30">
                          <TableCell className="font-mono text-xs">
                            {new Date(p.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            {Math.abs(p.prediction) < 0.01 ? p.prediction.toExponential(2) : p.prediction.toFixed(4)}
                          </TableCell>
                          <TableCell className={cn('font-mono text-xs font-medium', actual != null ? (actual > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-muted-foreground')}>
                            {actual != null ? actual.toFixed(4) : '—'}
                          </TableCell>
                          <TableCell>
                            {signal ? (
                              <Badge className={cn('text-[10px] font-bold', signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30')}>
                                {signal === 'LONG' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {signal}
                              </Badge>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg">
                <Activity className="h-10 w-10 mb-3 opacity-50" />
                <p>No predictions yet</p>
              </div>
            )}
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Target & Features - Combined */}
            {trainResult && (
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  Target & Features
                </h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Target Column</div>
                    <div className="font-mono text-sm font-medium text-primary">
                      {trainResult.target_column ?? 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Horizon</div>
                    <div className="font-mono text-sm font-medium">
                      {model.target_horizon_bars ?? 'N/A'} bars
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Features / Samples</div>
                    <div className="font-mono text-sm font-medium">
                      {trainResult.feature_columns?.length ?? 0} / {trainResult.train_samples ?? 0}
                    </div>
                  </div>
                </div>
                {trainResult.feature_columns && trainResult.feature_columns.length > 0 && (
                  <>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Feature Columns</div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {trainResult.feature_columns.map((feature: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-muted/50 border border-border/30 text-xs font-mono"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Training & XGBoost Config */}
            {model.train_size && model.train_size > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {/* Training Window */}
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-primary" />
                    Training Window
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Train Size</span>
                      <span className="font-mono font-medium">{model.train_size} bars</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Train/Val Gap</span>
                      <span className="font-mono font-medium">{model.train_test_gap} bars</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Val Split Ratio</span>
                      <span className="font-mono font-medium">{(model.val_split_ratio ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Target Horizon</span>
                      <span className="font-mono font-medium">{model.target_horizon_bars ?? 'N/A'} bars</span>
                    </div>
                  </div>
                </div>

                {/* Data Range */}
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    Data Range
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Train Start</span>
                      <span className="font-mono text-xs">{model.train_start_ts ? new Date(model.train_start_ts).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Train End</span>
                      <span className="font-mono text-xs">{model.train_end_ts ? new Date(model.train_end_ts).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Val Start</span>
                      <span className="font-mono text-xs">{model.val_start_ts ? new Date(model.val_start_ts).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Val End</span>
                      <span className="font-mono text-xs">{model.val_end_ts ? new Date(model.val_end_ts).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* XGBoost Config */}
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <Cpu className="h-4 w-4 text-primary" />
                    XGBoost Hyperparameters
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Objective</span>
                      <span className="font-mono text-xs">{model.xgb_objective ?? 'N/A'}</span>
                    </div>
                    {model.xgb_objective === 'reg:quantileerror' && (
                      <div className="flex justify-between py-1.5 border-b border-border/30">
                        <span className="text-muted-foreground">Quantile Alpha</span>
                        <span className="font-mono">{model.xgb_quantile_alpha?.toFixed(2) ?? 'N/A'}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Max Depth</span>
                      <span className="font-mono">{model.xgb_max_depth ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Learning Rate (η)</span>
                      <span className="font-mono">{model.xgb_eta?.toFixed(4) ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Num Rounds</span>
                      <span className="font-mono">{model.xgb_n_rounds ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Subsample</span>
                      <span className="font-mono">{model.xgb_subsample?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Colsample Bytree</span>
                      <span className="font-mono">{model.xgb_colsample_bytree?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/30">
                      <span className="text-muted-foreground">Lambda (L2)</span>
                      <span className="font-mono">{model.xgb_lambda?.toFixed(4) ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">Min Child Weight</span>
                      <span className="font-mono">{model.xgb_min_child_weight ?? 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : !trainResult ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                Legacy model - training configuration not tracked. Re-deploy via "Deploy Model" to see parameters.
              </div>
            ) : null}

            {/* Training Result Stats */}
            {trainResult && (
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg border border-border/50 bg-card/50 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Best Iteration</div>
                  <div className="font-mono text-lg font-bold">{trainResult.best_iteration ?? 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-card/50 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Best Score</div>
                  <div className="font-mono text-lg font-bold">{trainResult.best_score?.toFixed(6) ?? 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-card/50 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Val Samples</div>
                  <div className="font-mono text-lg font-bold">{trainResult.val_samples ?? trainResult.validation_samples ?? 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg border border-border/50 bg-card/50 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Model Size</div>
                  <div className="font-mono text-lg font-bold">
                    {trainResult.model_size_bytes ? `${(trainResult.model_size_bytes / 1024).toFixed(0)} KB` : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Thresholds from Training */}
            {trainResult?.thresholds && (
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-primary" />
                  Trained Thresholds
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Long Optimal</div>
                    <div className="font-mono text-sm text-emerald-400">{trainResult.thresholds.long_optimal?.toFixed(6) ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Short Optimal</div>
                    <div className="font-mono text-sm text-red-400">{trainResult.thresholds.short_optimal?.toFixed(6) ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Long P95</div>
                    <div className="font-mono text-sm">{trainResult.thresholds.long_percentile_95?.toFixed(6) ?? 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Short P5</div>
                    <div className="font-mono text-sm">{trainResult.thresholds.short_percentile_05?.toFixed(6) ?? 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LIVE MODEL PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const LiveModelPage = () => {
  const { cachedRuns } = useRunsContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const goLiveMutation = useGoLive();
  const { data: activeModel, isLoading: activeModelLoading, isError: activeModelError } = useActiveModel();
  const { data: liveModels = [], isLoading: liveModelsLoading } = useLiveModels();
  const activateModel = useActivateModel();
  const deactivateModel = useDeactivateModel();
  const deleteModel = useDeleteModel();
  const updateThresholds = useUpdateThresholds();
  const { predictions: livePredictions, targets: liveTargets, maturedTargets } = useMarketDataContext();

  // Executor management state
  const [executorModalOpen, setExecutorModalOpen] = useState(false);
  const [executorModalMode, setExecutorModalMode] = useState<'attach' | 'update'>('attach');
  const [executorTargetModel, setExecutorTargetModel] = useState<LiveModelSummary | null>(null);
  const attachExecutor = useAttachExecutor();
  const updateExecutor = useUpdateExecutor();
  const detachExecutor = useDetachExecutor();

  // Model cards horizontal scroll
  const modelCardsRef = useRef<HTMLDivElement>(null);

  // Map of matured target values from /ws/live WebSocket events (legacy target_matured events)
  const maturedTargetsByStreamTs = useMemo(() => {
    const map = new Map<string, number>();
    liveTargets.forEach((t) => {
      map.set(`${t.streamId}:${t.originTs}`, t.value);
    });
    return map;
  }, [liveTargets]);

  // Map of extracted targets from indicator snapshots
  const extractedTargetsByKey = useMemo(() => {
    const map = new Map<string, number>();
    maturedTargets.forEach((t) => {
      map.set(`${t.streamId}:${t.targetName}:${t.predictionTs}`, t.value);
    });
    return map;
  }, [maturedTargets]);

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [longThresholdInput, setLongThresholdInput] = useState<string>('');
  const [shortThresholdInput, setShortThresholdInput] = useState<string>('');

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

  useEffect(() => {
    if (activeModel?.model_id) {
      setSelectedModelId(activeModel.model_id);
    }
  }, [activeModel?.model_id]);

  useEffect(() => {
    if (activeModel?.long_threshold !== undefined) {
      setLongThresholdInput(activeModel.long_threshold.toString());
    }
    if (activeModel?.short_threshold !== undefined) {
      setShortThresholdInput(activeModel.short_threshold.toString());
    }
  }, [activeModel?.long_threshold, activeModel?.short_threshold]);

  const metricsModelId = selectedModelId || activeModel?.model_id || null;
  const selectedModel = liveModels.find((m) => m.model_id === selectedModelId);

  const metricsQuery = useQuery({
    queryKey: ['kraken', 'metrics', metricsModelId],
    enabled: !!metricsModelId,
    queryFn: async () => {
      const resp = await krakenClient.getMetrics(metricsModelId!);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load metrics');
      }
      return resp.data;
    },
    // Metrics (training results) rarely change - cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Keep showing previous data while fetching new data (avoids "no metrics" flash)
    placeholderData: keepPreviousData,
  });

  const predictionsQuery = useQuery<{ ts_ms: number; prediction: number; long_threshold: number; short_threshold: number; feature_hash?: string; model_id?: string; actual?: number; matched?: boolean }[]>({
    queryKey: ['kraken', 'predictions', metricsModelId],
    enabled: !!metricsModelId,
    queryFn: async () => {
      const resp = await krakenClient.getPredictions(metricsModelId!, 50);
      if (!resp.success || !resp.data) {
        throw new Error(resp.error || 'Failed to load predictions');
      }
      return resp.data.predictions;
    },
    // Predictions history - cache for 2 minutes, new predictions come via WebSocket
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Keep showing previous data while fetching
    placeholderData: keepPreviousData,
  });

  const handleGoLive = () => {
    if (!selectedRun) {
      toast({ title: 'No run selected', description: 'Load a run from Walkforward first', variant: 'destructive' });
      return;
    }
    goLiveMutation.mutate({ run_id: selectedRun.run_id, run: selectedRun });
    setModalOpen(false);
  };

  const hasActiveModel = activeModel && activeModel.model_id;
  const baseTrainResult: XGBoostTrainResult | null = (metricsQuery.data?.train_result as XGBoostTrainResult | undefined)
    || (activeModel?.train_result as XGBoostTrainResult | undefined)
    || null;
  const horizonBars = metricsQuery.data?.target_horizon_bars ?? activeModel?.target_horizon_bars ?? 0;
  const targetColumnName = baseTrainResult?.target_column ?? null;
  const metricsError = metricsQuery.error instanceof Error ? metricsQuery.error.message : null;

  const combinedPredictions = useMemo(() => {
    const predMap = new Map<number, {
      modelId: string;
      streamId: string;
      ts: number;
      prediction: number;
      longThreshold: number;
      shortThreshold: number;
      actual?: number;
    }>();

    predictionsQuery.data
      ?.filter((p) => !metricsModelId || p.model_id === metricsModelId)
      .forEach((p) => {
        predMap.set(p.ts_ms, {
          modelId: p.model_id ?? metricsModelId ?? 'unknown',
          streamId: activeModel?.stream_id ?? 'unknown',
          ts: p.ts_ms,
          prediction: p.prediction,
          longThreshold: p.long_threshold,
          shortThreshold: p.short_threshold,
          actual: p.actual,
        });
      });

    livePredictions
      .filter((p) => !metricsModelId || p.modelId === metricsModelId)
      .forEach((p) => {
        if (!predMap.has(p.ts)) {
          predMap.set(p.ts, {
            modelId: p.modelId,
            streamId: p.streamId,
            ts: p.ts,
            prediction: p.prediction,
            longThreshold: p.longThreshold,
            shortThreshold: p.shortThreshold,
          });
        }
      });

    if (targetColumnName) {
      for (const [ts, pred] of predMap) {
        if (pred.actual === undefined) {
          const extractedActual = extractedTargetsByKey.get(`${pred.streamId}:${targetColumnName}:${ts}`);
          if (extractedActual !== undefined) {
            pred.actual = extractedActual;
          }
        }
      }
    }

    return Array.from(predMap.values())
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
  }, [activeModel?.stream_id, extractedTargetsByKey, livePredictions, metricsModelId, predictionsQuery.data, targetColumnName]);

  const trainResult = useMemo(() => {
    if (!baseTrainResult) return null;
    const liveWithActuals = combinedPredictions.filter((p) => p.actual !== undefined);
    if (liveWithActuals.length === 0) return baseTrainResult;

    const testPredictions = liveWithActuals.map((p) => p.prediction);
    const testActuals = liveWithActuals.map((p) => p.actual as number);
    const testTimestamps = liveWithActuals.map((p) => p.ts);

    return {
      ...baseTrainResult,
      predictions: { ...baseTrainResult.predictions, test: testPredictions },
      actuals: { ...baseTrainResult.actuals, test: testActuals },
      timestamps: { ...baseTrainResult.timestamps, test: testTimestamps },
    };
  }, [baseTrainResult, combinedPredictions]);

  // Count stats
  const activeModelsCount = liveModels.filter(m => m.status === 'active').length;
  const tradingModelsCount = liveModels.filter(m => m.has_executor && m.executor_enabled).length;

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-border/50">
        <div className="px-6 py-6">
          {/* Top Row: Title + Go Live */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Live Models</h1>
                <p className="text-xs text-muted-foreground">
                  Deploy and monitor production ML models
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-3 mr-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-emerald-400">{activeModelsCount}</span>
                  <span className="text-muted-foreground">active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="font-mono text-primary">{tradingModelsCount}</span>
                  <span className="text-muted-foreground">trading</span>
                </div>
              </div>

              {/* Run Selector + Go Live */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  disabled={runList.length === 0}
                  className="h-9 px-3 rounded-md bg-muted border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  {runList.length === 0 ? (
                    <option>Load run in Walkforward</option>
                  ) : (
                    runList.map((run) => (
                      <option key={run.run_id} value={run.run_id}>
                        {run.run_id.slice(0, 8)}… ({run.dataset_id})
                      </option>
                    ))
                  )}
                </select>
                <Button
                  onClick={() => setModalOpen(true)}
                  disabled={!selectedRun}
                  size="sm"
                  className="h-9"
                >
                  <Rocket className="h-3.5 w-3.5 mr-1.5" />
                  Deploy
                </Button>
              </div>
            </div>
          </div>

          {/* MODEL CARDS - Responsive Grid */}
          {liveModelsLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <Cpu className="absolute inset-0 m-auto h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Loading models...</span>
            </div>
          ) : liveModels.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 mb-4">
                <Rocket className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No models deployed</h3>
              <p className="text-sm text-muted-foreground">
                Select a run from the dropdown and click Deploy to get started.
              </p>
            </div>
          ) : (
            <div
              ref={modelCardsRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {liveModels.map((model) => (
                <ModelCard
                  key={model.model_id}
                  model={model}
                  isSelected={selectedModelId === model.model_id}
                  isActive={model.status === 'active'}
                  onSelect={() => setSelectedModelId(model.model_id)}
                  onActivate={() => activateModel.mutate(model.model_id)}
                  onDeactivate={() => deactivateModel.mutate(model.model_id)}
                  onDelete={() => deleteModel.mutate(model.model_id)}
                  onAttachExecutor={() => {
                    setExecutorTargetModel(model);
                    setExecutorModalMode('attach');
                    setExecutorModalOpen(true);
                  }}
                  onConfigExecutor={() => {
                    setExecutorTargetModel(model);
                    setExecutorModalMode('update');
                    setExecutorModalOpen(true);
                  }}
                  onDetachExecutor={() => {
                    if (window.confirm(`Detach executor from ${model.model_id.slice(0, 8)}…?`)) {
                      detachExecutor.mutate(model.model_id);
                    }
                  }}
                  isPending={activateModel.isPending || deactivateModel.isPending || deleteModel.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MODEL DETAIL PANEL - Tabbed interface for selected model */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {selectedModelId && selectedModel ? (
        <ModelDetailPanel
          model={selectedModel}
          metricsQuery={metricsQuery}
          metricsError={metricsError}
          trainResult={trainResult}
          combinedPredictions={combinedPredictions}
          horizonBars={horizonBars}
          targetColumnName={targetColumnName}
          extractedTargetsByKey={extractedTargetsByKey}
          maturedTargetsByStreamTs={maturedTargetsByStreamTs}
          longThresholdInput={longThresholdInput}
          shortThresholdInput={shortThresholdInput}
          setLongThresholdInput={setLongThresholdInput}
          setShortThresholdInput={setShortThresholdInput}
          updateThresholds={updateThresholds}
          metricsModelId={metricsModelId}
          onClose={() => setSelectedModelId(null)}
        />
      ) : liveModels.length > 0 ? (
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-muted/50 mb-4">
              <Eye className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a model to view details</h3>
            <p className="text-sm text-muted-foreground">
              Click on any model card above to see its performance metrics and configuration
            </p>
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      <GoLiveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleGoLive}
        run={selectedRun}
        isSubmitting={goLiveMutation.isPending}
      />

      <Stage1ExecutorBindingModal
        open={executorModalOpen}
        onClose={() => {
          setExecutorModalOpen(false);
          setExecutorTargetModel(null);
        }}
        onSubmit={(request: Stage1ExecutorBindingUpsertRequest) => {
          if (executorModalMode === 'attach') {
            attachExecutor.mutate(
              request,
              { onSuccess: () => { setExecutorModalOpen(false); setExecutorTargetModel(null); } }
            );
          } else {
            updateExecutor.mutate(
              request,
              { onSuccess: () => { setExecutorModalOpen(false); setExecutorTargetModel(null); } }
            );
          }
        }}
        model={executorTargetModel}
        isSubmitting={attachExecutor.isPending || updateExecutor.isPending}
        mode={executorModalMode}
      />
    </div>
  );
};

export default LiveModelPage;
