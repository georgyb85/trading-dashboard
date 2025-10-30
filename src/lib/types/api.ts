// API Types aligned with Stage 1 Postgres Schema

// Dataset Types
export interface Dataset {
  id: number;
  name: string;
  source_table: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: number;
  dataset_id: number;
  name: string;
  data_type: string;
  description?: string;
  is_active: boolean;
}

export interface Target {
  id: number;
  dataset_id: number;
  name: string;
  data_type: string;
  description?: string;
  is_active: boolean;
}

// Walkforward Types
export interface WalkforwardRun {
  id: number;
  dataset_id: number;
  model_type: string;
  config: WalkforwardConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metrics?: WalkforwardMetrics;
}

export interface WalkforwardConfig {
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
  maxDepth?: number;
  minChildWeight?: number;
  learningRate?: number;
  numRounds?: number;
  earlyStopping?: number;
  minRounds?: number;
  subsample?: number;
  colsampleBytree?: number;
  lambda?: number;
  forceMinimumTraining?: boolean;
  objective?: string;
  quantileAlpha?: number;
  thresholdMethod?: string;
}

export interface WalkforwardMetrics {
  totalFolds: number;
  totalReturn: number;
  profitFactorLong: number;
  profitFactorShort: number;
  profitFactorDual: number;
  signalsLong: number;
  signalsShort: number;
  signalsDual: number;
  totalTrades: number;
  hitRateLong: number;
  hitRateShort: number;
  hitRateTotal: number;
  runtimeMs: number;
}

export interface WalkforwardFold {
  id: number;
  run_id: number;
  fold_number: number;
  train_start_idx: number;
  train_end_idx: number;
  test_start_idx: number;
  test_end_idx: number;
  iterations: number;
  signals_long: number;
  signals_short: number;
  signals_total: number;
  hit_rate_long: number;
  hit_rate_short: number;
  hit_rate_total: number;
  pnl_sum: number;
  pnl_running: number;
  profit_factor_train: number;
  profit_factor_long: number;
  profit_factor_short: number;
  profit_factor_dual: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

// Trade Simulation Types
export interface TradeSimulationRun {
  id: number;
  walkforward_run_id?: number;
  name: string;
  config: TradeSimulationConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metrics?: TradeSimulationMetrics;
}

export interface TradeSimulationConfig {
  initialCapital: number;
  positionSizing: string;
  riskPerTrade: number;
  commissionRate: number;
  slippageRate: number;
  maxPositions: number;
}

export interface TradeSimulationMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
}

export interface Trade {
  id: number;
  simulation_id: number;
  fold_number: number;
  trade_type: 'Long' | 'Short';
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  entry_signal: number;
  exit_signal: number;
  pnl: number;
  return_pct: number;
  cumulative_return_pct: number;
  position_size: number;
  commission: number;
  slippage: number;
}

// LFS (Local Feature Selection) Types
export interface LfsAnalysisRun {
  id: number;
  dataset_id: number;
  target_name: string;
  feature_names: string[];
  config: LfsConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: LfsResults;
  created_at: string;
  completed_at?: string;
}

export interface LfsConfig {
  cases: number;
  maxKept: number;
  iterations: number;
  monteCarloTrials: number;
  betaTrials: number;
  maxThreads: number;
  targetBins: number;
}

export interface LfsResults {
  features: LfsFeatureResult[];
  summary: LfsSummary;
  recommendations: string[];
  cautions: LfsCaution[];
}

export interface LfsFeatureResult {
  rank: number;
  significance: string;
  variable: string;
  percentile: number;
  solo_p_value: number;
  unbiased_p_value: number;
}

export interface LfsSummary {
  highly_significant: number;
  significant: number;
  marginal: number;
  noise: number;
}

export interface LfsCaution {
  feature: string;
  percentile: number;
  p_value: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
