// backend/services/iaRouter.js

import OpenAI from "openai";
import fs from "fs";
import path from "path";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
CACHE GLOBAL
=============================== */

let IA_CACHE = [];

try {

  const cachePath = path.resolve("backend/data/ia_cache_base.json");

  if(fs.existsSync(cachePath)){

    const raw = fs.readFileSync(cachePath,"utf-8");
    const json = JSON.parse(raw);

    if(Array.isArray(json)){
      IA_CACHE = json;
    }

  }

}catch(err){
  console.error("Erro carregando ia_cache_base:",err);
}

/* ===============================
MEMÓRIA
=============================== */

const MEMORY = new Map();
const MAX_HISTORY = 8;

function getHistory(id){
  return MEMORY.get(id) || [];
}

function saveTurn(id,role,content){

  const h = getHistory(id);

  h.push({role,content});

  MEMORY.set(
    id,
    h.slice(-MAX_HISTORY*2)
  );

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
CACHE MATCH POR KEYWORD
=============================== */

function matchByKeyword(text){

  const t = normalize(text);

  for(const item of IA_CACHE){

    if(!item.keywords) continue;

    for(const kw of item.keywords){

      if(t.includes(normalize(kw))){

        if(item.replyTemplates?.length){

          return item.replyTemplates[
            Math.floor(Math.random()*item.replyTemplates.length)
          ];

        }

      }

    }

  }

  return null;

}

/* ===============================
CACHE MATCH POR INTENT
=============================== */

function matchByIntent(intent){

  if(!intent) return null;

  for(const item of IA_CACHE){

    if(item.intent === intent.intent){

      if(item.replyTemplates?.length){

        return item.replyTemplates[
          Math.floor(Math.random()*item.replyTemplates.length)
        ];

      }

    }

  }

  return null;

}

/* ===============================
PROMPT
=============================== */

function buildPrompt(persona,intent){

  let personaBlock = "";

  if(persona){

    personaBlock = `

PERSONA:

${persona.label}

Função:
${persona.role}

Tom:
${persona.tone}

`;

  }

  let intentBlock = "";

  if(intent){

    intentBlock = `

INTENT DETECTADO:
${intent.intent}

`;

  }

  return `
Você é Nayla, assistente da Nexus Store.

Objetivo:
Ajudar clientes a escolher produtos.

Regras:

- Converse como humano
- Seja consultiva
- Pergunte orçamento
- Ajude a decidir

${personaBlock}

${intentBlock}

`.trim();

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalizeSlang(message);

  /* ===============================
  1 INTENT DETECTION
  =============================== */

  const intent = detectIntent(text);

  /* ===============================
  2 PERSONA
  =============================== */

  const persona = selectPersona(text);

  /* ===============================
  3 CACHE MATCH KEYWORD
  =============================== */

  const keywordMatch = matchByKeyword(text);

  if(keywordMatch){

    saveTurn(conversationId,"user",text);
    saveTurn(conversationId,"assistant",keywordMatch);

    return {
      reply:keywordMatch,
      suggestions:[]
    };

  }

  /* ===============================
  4 CACHE MATCH INTENT
  =============================== */

  const intentMatch = matchByIntent(intent);

  if(intentMatch){

    saveTurn(conversationId,"user",text);
    saveTurn(conversationId,"assistant",intentMatch);

    return {
      reply:intentMatch,
      suggestions:[]
    };

  }

  /* ===============================
  5 OPENAI FALLBACK
  =============================== */

  const history = getHistory(conversationId);

  const input = [

    {
      role:"system",
      content:buildPrompt(persona,intent)
    },

    ...history,

    {
      role:"user",
      content:text
    }

  ];

  let reply="";

  try{

    const resp = await client.responses.create({

      model:"gpt-4o-mini",

      input,

      temperature:0.7,
      max_output_tokens:220

    });

    reply =
      resp.output_text?.trim()
      ||
      "Pode explicar melhor o que você procura?";

  }catch(err){

    console.error("Erro OpenAI:",err);

    reply = "Pode explicar melhor o que você procura?";

  }

  saveTurn(conversationId,"user",text);
  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}