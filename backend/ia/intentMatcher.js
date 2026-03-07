import fs from "fs";
import path from "path";

let INTENT_CACHE = null;

/* ===============================
LOAD INTENTS (CACHE GLOBAL)
=============================== */

function loadIntents(){

  if(INTENT_CACHE){
    return INTENT_CACHE;
  }

  try{

    const filePath = path.resolve("backend/data/ia_cache_base.json");

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    INTENT_CACHE = Array.isArray(json) ? json : [];

    return INTENT_CACHE;

  }catch(err){

    console.error("Intent load error:",err);

    return [];

  }

}

/* ===============================
NORMALIZE
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
TOKENIZE
=============================== */

function tokenize(text){

  return normalize(text)
    .split(" ")
    .filter(Boolean);

}

/* ===============================
SCORE INTENT
=============================== */

function scoreIntent(message,intent){

  let score = 0;

  const text = normalize(message);

  const tokens = tokenize(message);

  /* ===============================
  KEYWORDS
  =============================== */

  if(intent.keywords){

    for(const kw of intent.keywords){

      const k = normalize(kw);

      if(text.includes(k)){
        score += 6;
      }

      const kwTokens = tokenize(k);

      for(const t of tokens){

        if(kwTokens.includes(t)){
          score += 2;
        }

      }

    }

  }

  /* ===============================
  USER EXAMPLES
  =============================== */

  if(intent.userExamples){

    for(const ex of intent.userExamples){

      const e = normalize(ex);

      if(text.includes(e)){
        score += 10;
      }

    }

  }

  /* ===============================
  ACTIVATION SIGNALS
  =============================== */

  if(intent.activationSignals){

    for(const sig of intent.activationSignals){

      const s = normalize(sig);

      if(text.includes(s)){
        score += 8;
      }

    }

  }

  /* ===============================
  NUMBERS (orçamento etc)
  =============================== */

  const numberMatch = message.match(/[0-9]+/g);

  if(numberMatch && intent.intent.includes("budget")){
    score += 6;
  }

  return score;

}

/* ===============================
BEST INTENT MATCH
=============================== */

export function detectIntent(message){

  const intents = loadIntents();

  if(!intents.length){
    return null;
  }

  let bestIntent = null;
  let bestScore = 0;

  for(const intent of intents){

    const score = scoreIntent(message,intent);

    if(score > bestScore){

      bestScore = score;
      bestIntent = intent;

    }

  }

  if(bestScore < 4){
    return null;
  }

  return bestIntent;

}