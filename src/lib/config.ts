// Application configuration

export const config = {
  // Stage1 API base URL
  stage1ApiBaseUrl: import.meta.env.VITE_STAGE1_API_BASE_URL || 'https://agenticresearch.info',

  // Optional Stage1 API token
  stage1ApiToken: import.meta.env.VITE_STAGE1_API_TOKEN || '',

  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
