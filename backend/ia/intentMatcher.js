import fs from "fs";
import path from "path";

let INTENT_CACHE = null;

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

export function detectIntent(message){

  const text = String(message||"").toLowerCase();

  const intents = loadIntents();

  for(const intent of intents){

    for(const kw of intent.keywords){

      if(text.includes(kw)){
        return intent;
      }

    }

  }

  return null;

}