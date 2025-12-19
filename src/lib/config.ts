// Application configuration

export const config = {
  // Stage1 API base URL
  stage1ApiBaseUrl: import.meta.env.VITE_STAGE1_API_BASE_URL || 'https://agenticresearch.info',

  // Optional Stage1 API token
  stage1ApiToken: import.meta.env.VITE_STAGE1_API_TOKEN || '',

  // Kraken XGBoost WebSocket endpoint (proxied through nginx for SSL)
  krakenXgboostWsUrl: import.meta.env.VITE_KRAKEN_XGBOOST_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/xgboost-ws`,

  // Kraken WebSocket base URL (for usage stream, live stream - proxied through nginx/caddy for SSL)
  krakenWsBaseUrl: import.meta.env.VITE_KRAKEN_WS_BASE_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`,

  // Kraken REST base URL (for Go Live / active model endpoints)
  krakenRestBaseUrl: import.meta.env.VITE_KRAKEN_REST_BASE_URL || `${window.location.origin}`,

  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
