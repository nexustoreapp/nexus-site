// backend/ia/intentMatcher.js

import fs from "fs";
import path from "path";

/* ===============================
CACHE
=============================== */

let INTENT_CACHE = null;

/* ===============================
LOAD INTENTS (FRAGMENTED)
=============================== */

function loadIntents(){

  if(INTENT_CACHE){
    return INTENT_CACHE;
  }

  try{

    const intentsDir = path.resolve("backend/data/intents");

    if(!fs.existsSync(intentsDir)){
      return [];
    }

    const files = fs.readdirSync(intentsDir);

    const allIntents = [];

    for(const file of files){

      if(!file.endsWith(".json")) continue;

      const filePath = path.join(intentsDir,file);

      const raw = fs.readFileSync(filePath,"utf-8");

      const json = JSON.parse(raw);

      if(Array.isArray(json)){
        allIntents.push(...json);
      }

    }

    INTENT_CACHE = allIntents;

    return INTENT_CACHE;

  }catch(err){

    console.error("Erro carregando intents:",err);

    return [];

  }

}

/* ===============================
NORMALIZE
=============================== */

function normalize(text=""){

  return String(text)
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

  return normalize(text).split(" ").filter(Boolean);

}

/* ===============================
KEYWORD SCORE
=============================== */

function scoreKeywords(tokens,keywords=[]){

  let score = 0;

  for(const kw of keywords){

    const k = normalize(kw);

    for(const t of tokens){

      if(t === k){
        score += 4;
      }

      if(k.includes(t) || t.includes(k)){
        score += 2;
      }

    }

  }

  return score;

}

/* ===============================
EXAMPLE SCORE
=============================== */

function scoreExamples(message,examples=[]){

  const m = normalize(message);

  let score = 0;

  for(const ex of examples){

    const e = normalize(ex);

    if(m.includes(e)){
      score += 6;
    }

  }

  return score;

}

/* ===============================
SIGNAL SCORE
=============================== */

function scoreSignals(tokens,signals=[]){

  let score = 0;

  for(const s of signals){

    const sig = normalize(s);

    for(const t of tokens){

      if(sig.includes(t) || t.includes(sig)){
        score += 3;
      }

    }

  }

  return score;

}

/* ===============================
INTENT SCORE
=============================== */

function scoreIntent(message,intent){

  const tokens = tokenize(message);

  let score = 0;

  score += scoreKeywords(tokens,intent.keywords || []);

  score += scoreExamples(message,intent.userExamples || []);

  score += scoreSignals(tokens,intent.activationSignals || []);

  return score;

}

/* ===============================
INTENT DETECTOR
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

  if(bestScore <= 0){
    return null;
  }

  return bestIntent;

}