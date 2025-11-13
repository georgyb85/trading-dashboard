// Application configuration

export const config = {
  // Stage1 API base URL
  stage1ApiBaseUrl: import.meta.env.VITE_STAGE1_API_BASE_URL || 'https://agenticresearch.info',

  // Optional Stage1 API token
  stage1ApiToken: import.meta.env.VITE_STAGE1_API_TOKEN || '',

  // Kraken XGBoost WebSocket endpoint (proxied through nginx for SSL)
  krakenXgboostWsUrl: import.meta.env.VITE_KRAKEN_XGBOOST_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/xgboost-ws`,

  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
