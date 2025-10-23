// LocalStorage cache utilities for persisting data across page refreshes and tab switches

const CACHE_KEYS = {
  COMPLETED_ORDERS: 'trading_completed_orders',
  SYSTEM_HEALTH: 'system_health_data',
  ACCOUNT_BALANCES: 'account_balances',
  ACCOUNT_POSITIONS: 'account_positions',
} as const;

export function saveToCache<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    console.log(`💾 Saved to cache: ${key}`);
  } catch (error) {
    console.error(`Failed to save to cache: ${key}`, error);
  }
}

export function loadFromCache<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(key);
    if (!serialized) return null;

    const data = JSON.parse(serialized) as T;
    console.log(`📂 Loaded from cache: ${key}`);
    return data;
  } catch (error) {
    console.error(`Failed to load from cache: ${key}`, error);
    return null;
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
    console.log(`🗑️ Cleared cache: ${key}`);
  } catch (error) {
    console.error(`Failed to clear cache: ${key}`, error);
  }
}

export function clearAllCache(): void {
  Object.values(CACHE_KEYS).forEach(key => clearCache(key));
}

export { CACHE_KEYS };
