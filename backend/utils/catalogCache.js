// backend/utils/catalogCache.js

import fs from "fs";
import path from "path";

const cache = new Map();

const INDEX_PATH = path.resolve("backend/data/catalog.index.json");
const CATALOG_FOLDER = path.resolve("backend/data/catalog");

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
LOAD INDEX
=============================== */

function loadIndex(){

  const cached = getCache("catalog_index");

  if(cached) return cached;

  try{

    const raw = fs.readFileSync(INDEX_PATH,"utf-8");
    const json = JSON.parse(raw);

    setCache("catalog_index",json,10*60*1000);

    return json;

  }catch(err){

    console.error("Erro carregando catalog.index:",err);
    return {};

  }

}

/* ===============================
LOAD CATEGORY FILE
=============================== */

function loadCategory(file){

  const key = "cat_"+file;

  const cached = getCache(key);
  if(cached) return cached;

  try{

    const filePath = path.join(CATALOG_FOLDER,file);

    const raw = fs.readFileSync(filePath,"utf-8");
    const json = JSON.parse(raw);

    setCache(key,json,10*60*1000);

    return json;

  }catch(err){

    console.error("Erro carregando categoria:",file,err);
    return [];

  }

}

/* ===============================
SEARCH PRODUCTS
=============================== */

export function searchCatalog(term){

  const index = loadIndex();

  const t = term.toLowerCase();

  const results = [];

  for(const id in index){

    const item = index[id];

    if(!item.active) continue;

    const fileProducts = loadCategory(item.file);

    const product = fileProducts.find(p=>p.id === id);

    if(!product) continue;

    const name = String(product.name || "").toLowerCase();

    if(name.includes(t)){
      results.push(product);
    }

  }

  return results.slice(0,5);

}