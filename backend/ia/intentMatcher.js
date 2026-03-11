import fs from "fs";
import path from "path";

/* ===============================
CACHE
=============================== */

let INTENT_CACHE = null;

/* ===============================
LOAD INTENTS
=============================== */

function loadIntents(){

  if(INTENT_CACHE){
    return INTENT_CACHE;
  }

  try{

    const intentsDir = path.resolve("backend/ia/intents");

    if(!fs.existsSync(intentsDir)){
      return [];
    }

    const files = fs.readdirSync(intentsDir);

    const all = [];

    for(const file of files){

      if(!file.endsWith(".json")) continue;

      const raw = fs.readFileSync(
        path.join(intentsDir,file),
        "utf-8"
      );

      const json = JSON.parse(raw);

      if(Array.isArray(json)){
        all.push(...json);
      }

    }

    INTENT_CACHE = all;

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

  return normalize(text)
  .split(" ")
  .filter(Boolean);

}

/* ===============================
KEYWORD SCORE
=============================== */

function scoreKeywords(message,tokens,keywords=[]){

  let score = 0;

  const normalizedMessage = normalize(message);

  for(const kw of keywords){

    const k = normalize(kw);

    /* frase inteira */

    if(normalizedMessage.includes(k)){
      score += 10;
    }

    /* token */

    for(const t of tokens){

      if(t === k){
        score += 6;
      }

      if(k.includes(t) || t.includes(k)){
        score += 3;
      }

    }

  }

  return score;

}

/* ===============================
EXAMPLES SCORE
=============================== */

function scoreExamples(message,examples=[]){

  let score = 0;

  const m = normalize(message);

  for(const ex of examples){

    const e = normalize(ex);

    if(m.includes(e)){
      score += 15;
    }

  }

  return score;

}

/* ===============================
SIGNALS SCORE
=============================== */

function scoreSignals(tokens,signals=[]){

  let score = 0;

  for(const s of signals){

    const sig = normalize(s);

    for(const t of tokens){

      if(sig === t){
        score += 8;
      }

      if(sig.includes(t) || t.includes(sig)){
        score += 4;
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

  score += scoreKeywords(
    message,
    tokens,
    intent.keywords || []
  );

  score += scoreExamples(
    message,
    intent.userExamples || []
  );

  score += scoreSignals(
    tokens,
    intent.activationSignals || []
  );

  /* prioridade */

  if(intent.priority){
    score += intent.priority;
  }

  return score;

}

/* ===============================
DETECT INTENT
=============================== */

export function detectIntent(message){

  const intents = loadIntents();

  if(!intents.length){
    return null;
  }

  let best = null;
  let bestScore = 0;

  for(const intent of intents){

    const score = scoreIntent(message,intent);

    if(score > bestScore){

      bestScore = score;
      best = intent;

    }

  }

  if(bestScore < 6){
    return null;
  }

  return best;

}