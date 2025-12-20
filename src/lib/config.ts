// Application configuration

const normalizeBaseUrl = (value: string, label: string): string => {
  const trimmed = value.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    if (import.meta.env.DEV) {
      console.warn(`[config] ${label} should not include /api; trimming for routing consistency.`);
    }
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const stage1BaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_STAGE1_API_BASE_URL || 'https://agenticresearch.info',
  'VITE_STAGE1_API_BASE_URL'
);
const stage1WsBaseUrl = stage1BaseUrl.replace(/^http/, 'ws');

const traderId = import.meta.env.VITE_TRADER_ID || 'kraken';
const traderBasePath = `/traders/${traderId}`;
const traderWsBasePath = `${traderBasePath}/ws`;
const traderRestBasePath = `${traderBasePath}/api`;

const krakenWsBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_KRAKEN_WS_BASE_URL || stage1WsBaseUrl,
  'VITE_KRAKEN_WS_BASE_URL'
);
const krakenRestBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_KRAKEN_REST_BASE_URL || `${stage1BaseUrl}${traderBasePath}`,
  'VITE_KRAKEN_REST_BASE_URL'
);
const krakenStatusWsPath = import.meta.env.VITE_KRAKEN_STATUS_WS_PATH || `${traderWsBasePath}/status`;
const krakenAccountWsPath = import.meta.env.VITE_KRAKEN_ACCOUNT_WS_PATH || `${traderWsBasePath}/account`;
const krakenUsageWsPath = import.meta.env.VITE_KRAKEN_USAGE_WS_PATH || `${traderWsBasePath}/usage`;
const krakenLiveWsPath = import.meta.env.VITE_KRAKEN_LIVE_WS_PATH || `${traderWsBasePath}/live`;
const krakenLogsWsPath = import.meta.env.VITE_KRAKEN_LOGS_WS_PATH || `${traderWsBasePath}/logs`;
const krakenPredictionsWsPath = import.meta.env.VITE_KRAKEN_PREDICTIONS_WS_PATH || `${traderWsBasePath}/predictions`;
const krakenXgboostWsPath = import.meta.env.VITE_KRAKEN_XGBOOST_WS_PATH || `${traderBasePath}/xgboost`;

export const config = {
  // Stage1 API base URL
  stage1ApiBaseUrl: stage1BaseUrl,

  // Optional Stage1 API token
  stage1ApiToken: import.meta.env.VITE_STAGE1_API_TOKEN || '',

  // Trader ID used for /traders/<id> routing
  traderId,
  traderBasePath,
  traderWsBasePath,
  traderRestBasePath,

  // Kraken XGBoost WebSocket endpoint (proxied through Stage1 nginx for SSL)
  krakenXgboostWsUrl: import.meta.env.VITE_KRAKEN_XGBOOST_WS_URL || `${krakenWsBaseUrl}${krakenXgboostWsPath}`,

  // Kraken WebSocket base URL (for status + usage streams; proxied through Stage1 nginx for SSL)
  krakenWsBaseUrl,

  // Kraken REST base URL (for Go Live / active model endpoints; proxied through Stage1 nginx)
  krakenRestBaseUrl,

  // Kraken WebSocket paths (allow override per environment)
  krakenStatusWsPath,
  krakenAccountWsPath,
  krakenUsageWsPath,
  krakenLiveWsPath,
  krakenLogsWsPath,
  krakenPredictionsWsPath,
  krakenXgboostWsPath,

  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
