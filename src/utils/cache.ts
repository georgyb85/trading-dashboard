// LocalStorage cache utilities for persisting data across page refreshes and tab switches

const CACHE_KEYS = {
  COMPLETED_ORDERS: 'trading_completed_orders',
  SYSTEM_HEALTH: 'system_health_data',
  ACCOUNT_BALANCES: 'account_balances',
  ACCOUNT_POSITIONS: 'account_positions',
} as const;

interface CacheEnvelope<T> {
  data: T;
  savedAt: number;
  version: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 2; // bump to invalidate all old caches

export function saveToCache<T>(key: string, data: T): void {
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      savedAt: Date.now(),
      version: CACHE_VERSION
    };
    localStorage.setItem(key, JSON.stringify(envelope));
    console.log(`💾 Saved to cache: ${key}`);
  } catch (error) {
    console.error(`Failed to save to cache: ${key}`, error);
  }
}

export function loadFromCache<T>(key: string, validate?: (data: unknown) => boolean): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Migration: detect old format (raw array/object without envelope)
    if (!parsed || typeof parsed.savedAt !== 'number') {
      localStorage.removeItem(key);
      return null;
    }

    const envelope = parsed as CacheEnvelope<T>;

    // Version check: discard if version mismatch (handles both old and future schemas)
    if (!envelope.version || envelope.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // TTL check: discard if expired
    if (Date.now() - envelope.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    // Shape check: discard if data fails caller-provided validation
    if (validate && !validate(envelope.data)) {
      localStorage.removeItem(key);
      return null;
    }

    console.log(`📂 Loaded from cache: ${key}`);
    return envelope.data;
  } catch (error) {
    console.error(`Failed to load from cache: ${key}`, error);
    localStorage.removeItem(key);
    return null;
  }
}

export function isArrayOfObjects(data: unknown): boolean {
  return Array.isArray(data) && data.every(item => item !== null && typeof item === 'object');
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
