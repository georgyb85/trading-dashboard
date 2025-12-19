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

const krakenWsBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_KRAKEN_WS_BASE_URL || stage1WsBaseUrl,
  'VITE_KRAKEN_WS_BASE_URL'
);
const krakenRestBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_KRAKEN_REST_BASE_URL || stage1BaseUrl,
  'VITE_KRAKEN_REST_BASE_URL'
);

export const config = {
  // Stage1 API base URL
  stage1ApiBaseUrl: stage1BaseUrl,

  // Optional Stage1 API token
  stage1ApiToken: import.meta.env.VITE_STAGE1_API_TOKEN || '',

  // Kraken XGBoost WebSocket endpoint (proxied through Stage1 nginx for SSL)
  krakenXgboostWsUrl: import.meta.env.VITE_KRAKEN_XGBOOST_WS_URL || `${krakenWsBaseUrl}/api/xgboost-ws`,

  // Kraken WebSocket base URL (for status + usage streams; proxied through Stage1 nginx for SSL)
  krakenWsBaseUrl,

  // Kraken REST base URL (for Go Live / active model endpoints; proxied through Stage1 nginx)
  krakenRestBaseUrl,

  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
