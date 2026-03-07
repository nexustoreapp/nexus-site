import fs from "fs";
import path from "path";

let INTENT_CACHE = null;

/* ===============================
LOAD INTENTS
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
SCORE MATCH
=============================== */

function scoreIntent(text,intent){

  let score = 0;

  const normalized = normalize(text);

  if(intent.keywords){

    for(const kw of intent.keywords){

      const k = normalize(kw);

      if(normalized.includes(k)){
        score += 3;
      }

    }

  }

  if(intent.userExamples){

    for(const ex of intent.userExamples){

      const e = normalize(ex);

      if(normalized.includes(e)){
        score += 5;
      }

    }

  }

  if(intent.activationSignals){

    for(const s of intent.activationSignals){

      const sig = normalize(s);

      if(normalized.includes(sig)){
        score += 4;
      }

    }

  }

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

  if(bestScore === 0){
    return null;
  }

  return bestIntent;

}