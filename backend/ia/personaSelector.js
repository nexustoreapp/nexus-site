import fs from "fs";
import path from "path";

let PERSONA_CACHE = null;

/* ===============================
LOAD PERSONAS (CACHE)
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
SCORE PERSONA
=============================== */

function scorePersona(text,persona){

  let score = 0;

  const normalized = normalize(text);

  /* activation signals */

  if(persona.activationSignals){

    for(const signal of persona.activationSignals){

      const s = normalize(signal);

      if(normalized.includes(s)){
        score += 5;
      }

    }

  }

  /* role */

  if(persona.role){

    const r = normalize(persona.role);

    if(normalized.includes(r)){
      score += 2;
    }

  }

  /* description */

  if(persona.description){

    const d = normalize(persona.description);

    if(normalized.includes(d)){
      score += 1;
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

    const vendedor = personas.find(p=>p.id==="vendedor_amigo");

    if(vendedor){
      return vendedor;
    }

    return personas[0];

  }

  return bestPersona;

}