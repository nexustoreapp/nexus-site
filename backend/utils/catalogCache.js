// backend/utils/catalogCache.js
const cache = new Map();

/**
 * Salva no cache
 */
export function setCache(key, value, ttlMs = 60_000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * Lê do cache
 */
export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

/**
 * Limpa tudo (debug / admin futuramente)
 */
export function clearCache() {
  cache.clear();
}