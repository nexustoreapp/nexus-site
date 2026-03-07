import fs from "fs";
import path from "path";

let PERSONA_CACHE = null;

/* ===============================
LOAD PERSONAS
=============================== */

function loadPersonas(){

  if(PERSONA_CACHE){
    return PERSONA_CACHE;
  }

  try{

    const filePath = path.resolve("backend/data/ia_personas.json");

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    PERSONA_CACHE = Array.isArray(json) ? json : [];

    return PERSONA_CACHE;

  }catch(err){

    console.error("Erro carregando personas:",err);

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
SCORE PERSONA
=============================== */

function scorePersona(text,persona){

  const normalized = normalize(text);

  let score = 0;

  /* activation signals */

  if(persona.activationSignals){

    for(const signal of persona.activationSignals){

      const s = normalize(signal);

      if(normalized.includes(s)){
        score += 6;
      }

    }

  }

  /* role relevance */

  if(persona.role){

    const r = normalize(persona.role);

    if(normalized.includes(r)){
      score += 2;
    }

  }

  /* behavior hints */

  if(persona.behavior){

    for(const b of persona.behavior){

      const behavior = normalize(b);

      if(normalized.includes(behavior)){
        score += 1;
      }

    }

  }

  return score;

}

/* ===============================
PERSONA DETECTOR
=============================== */

export function selectPersona(message){

  const personas = loadPersonas();

  if(!personas.length){
    return null;
  }

  const text = normalize(message);

  let bestPersona = null;
  let bestScore = 0;

  for(const persona of personas){

    const score = scorePersona(text,persona);

    if(score > bestScore){

      bestScore = score;
      bestPersona = persona;

    }

  }

  /* fallback */

  if(!bestPersona){

    return personas.find(p=>p.id==="vendedor_amigo") || personas[0];

  }

  return bestPersona;

}