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

  if(persona.activationSignals){

    for(const signal of persona.activationSignals){

      const s = normalize(signal);

      if(normalized.includes(s)){
        score += 5;
      }

    }

  }

  if(persona.role){

    const r = normalize(persona.role);

    if(normalized.includes(r)){
      score += 2;
    }

  }

  if(persona.description){

    const d = normalize(persona.description);

    if(normalized.includes(d)){
      score += 1;
    }

  }

  return score;

}

/* ===============================
GUIDED QUESTIONS
=============================== */

export function getGuidedQuestions(persona){

  if(!persona) return [];

  if(persona.id === "gamer_braba"){

    return [
      "Qual seu orçamento para o setup?",
      "Você pretende jogar quais jogos?",
      "Prefere focar mais em FPS ou qualidade gráfica?"
    ];

  }

  if(persona.id === "vendedor_amigo"){

    return [
      "Qual tipo de produto você está procurando?",
      "Você já tem algum orçamento em mente?",
      "Prefere algo mais custo-benefício ou mais potente?"
    ];

  }

  if(persona.id === "assistente_premium"){

    return [
      "Você quer entender melhor os planos ou alguma funcionalidade específica?",
      "Quer ajuda para escolher o melhor plano?",
      "Você pretende usar a Nexus com que frequência?"
    ];

  }

  return [
    "Pode me contar um pouco mais do que você procura?"
  ];

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

  if(!bestPersona){

    const vendedor = personas.find(p=>p.id==="vendedor_amigo");

    if(vendedor){
      return vendedor;
    }

    return personas[0];

  }

  return bestPersona;

}