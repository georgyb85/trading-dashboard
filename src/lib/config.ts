// Application configuration

const stage1BaseUrl = (import.meta.env.VITE_STAGE1_API_BASE_URL || 'https://agenticresearch.info').replace(/\/+$/, '');
const stage1WsBaseUrl = stage1BaseUrl.replace(/^http/, 'ws');

const krakenWsBaseUrl = (import.meta.env.VITE_KRAKEN_WS_BASE_URL || stage1WsBaseUrl).replace(/\/+$/, '');
const krakenRestBaseUrl = (import.meta.env.VITE_KRAKEN_REST_BASE_URL || stage1BaseUrl).replace(/\/+$/, '');

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
