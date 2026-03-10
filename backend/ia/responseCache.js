// backend/ia/responseCache.js

const CACHE = new Map();

export function setResponseCache(key,response){

  CACHE.set(key,{
    response,
    timestamp: Date.now()
  });

}

export function getResponseCache(key){

  const item = CACHE.get(key);

  if(!item) return null;

  return item.response;

}