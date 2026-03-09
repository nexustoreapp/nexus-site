// backend/utils/catalogCache.js

import fs from "fs";
import path from "path";

const cache = new Map();

const CATALOG_PATH = path.resolve("backend/data/catalog.index.json");

/**
Cache simples em memória com TTL
*/

export function setCache(key, data, ttlMs = 5 * 60 * 1000) {

  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  });

}

export function getCache(key) {

  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.data;

}

export function clearCache(key) {
  cache.delete(key);
}

export function clearAllCache() {
  cache.clear();
}

/* ===============================
CATALOG LOAD
=============================== */

export function loadCatalog() {

  const cached = getCache("catalog");

  if (cached) return cached;

  try {

    const raw = fs.readFileSync(CATALOG_PATH, "utf-8");

    const json = JSON.parse(raw);

    setCache("catalog", json, 10 * 60 * 1000);

    return json;

  } catch (err) {

    console.error("Erro carregando catálogo:", err);

    return [];

  }

}

/* ===============================
SEARCH PRODUCTS
=============================== */

export function searchCatalog(term) {

  const catalog = loadCatalog();

  const t = term.toLowerCase();

  return catalog.filter(p => {

    if (!p.name) return false;

    return p.name.toLowerCase().includes(t);

  }).slice(0,5);

}