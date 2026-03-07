import fs from "fs";
import path from "path";

let INTENT_CACHE = null;

/* ===============================
CARREGAR INTENTS UMA VEZ
=============================== */

function loadIntents(){

  if(INTENT_CACHE){
    return INTENT_CACHE;
  }

  try{

    const filePath = path.resolve("backend/data/intents.json");

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    INTENT_CACHE = Array.isArray(json) ? json : [];

    return INTENT_CACHE;

  }catch{

    INTENT_CACHE = [];
    return INTENT_CACHE;

  }

}

/* ===============================
NORMALIZAÇÃO
=============================== */

function normalize(text=""){

  return text
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g," ")
  .replace(/\s+/g," ")
  .trim();

}

/* ===============================
SCORE DE MATCH
=============================== */

function scoreMatch(text,keywords){

  let score = 0;

  for(const kw of keywords){

    const k = normalize(kw);

    if(text.includes(k)){
      score += 3;
    }

    const words = k.split(" ");

    for(const w of words){

      if(w.length < 3) continue;

      if(text.includes(w)){
        score += 1;
      }

    }

  }

  return score;

}

/* ===============================
DETECTAR INTENT
=============================== */

export function detectIntent(message){

  const text = normalize(String(message||""));

  const intents = loadIntents();

  let bestIntent = null;
  let bestScore = 0;

  for(const intent of intents){

    const score = scoreMatch(text,intent.keywords || []);

    if(score > bestScore){

      bestScore = score;
      bestIntent = intent;

    }

  }

  if(bestScore >= 2){
    return bestIntent;
  }

  return null;

}