import fs from "fs";
import path from "path";

let INTENT_CACHE = null;

export function loadAllIntents(){

  if(INTENT_CACHE){
    return INTENT_CACHE;
  }

  try{

    const intentsDir = path.resolve("backend/ia/intents");

    const files = fs.readdirSync(intentsDir);

    const allIntents = [];

    for(const file of files){

      if(!file.endsWith(".json")){
        continue;
      }

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