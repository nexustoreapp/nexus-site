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

  }catch(err){

    console.error("Erro carregando intents:",err);

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

  return normalize(text).split(" ").filter(Boolean);

}

/* ===============================
SCORE INTENT
=============================== */

function scoreIntent(message,intent){

  const text = normalize(message);

  let score = 0;

  /* keywords */

  if(intent.keywords){

    for(const kw of intent.keywords){

      const k = normalize(kw);

      if(text.includes(k)){
        score += 3;
      }

    }

  }

  /* user examples */

  if(intent.userExamples){

    for(const ex of intent.userExamples){

      const e = normalize(ex);

      if(text.includes(e)){
        score += 5;
      }

    }

  }

  /* activation signals */

  if(intent.activationSignals){

    for(const s of intent.activationSignals){

      const sig = normalize(s);

      if(text.includes(sig)){
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

  /* threshold mínimo */

  if(bestScore < 3){
    return null;
  }

  return bestIntent;

}