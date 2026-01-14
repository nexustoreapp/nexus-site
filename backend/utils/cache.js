// backend/utils/cache.js

const cache = new Map();

/**
 * Salva valor no cache
 */
export function setCache(key, value, ttlMs = 60_000) {
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { value, expiresAt });
}

/**
 * Lê valor do cache
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
 * Limpa cache específico ou geral
 */
export function clearCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}