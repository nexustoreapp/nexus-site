// backend/services/iaRouter.js

import fs from "fs";
import path from "path";
import OpenAI from "openai";

import { normalizeSlang } from "../ia/slangNormalizer.js";
import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =====================================================
GLOBAL CACHE (CARREGA UMA VEZ)
===================================================== */

let IA_CACHE = [];
let CATALOG_CACHE = [];

function loadJsonSafe(filePath){

  try{

    if(!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    if(Array.isArray(json)) return json;

    return [];

  }catch{
    return [];
  }

}

try{

  IA_CACHE = loadJsonSafe(
    path.resolve("backend/data/ia_cache_base.json")
  );

  const catalogFolder =
    path.resolve("backend/data/catalog");

  if(fs.existsSync(catalogFolder)){

    const files = fs.readdirSync(catalogFolder);

    for(const f of files){

      if(!f.endsWith(".json")) continue;

      const data = loadJsonSafe(
        path.join(catalogFolder,f)
      );

      CATALOG_CACHE.push(...data);

    }

  }

}catch(err){

  console.error("Erro carregando caches IA:",err);

}

/* =====================================================
UTILS
===================================================== */

function normalize(text=""){

  return text
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g," ")
  .replace(/\s+/g," ")
  .trim();

}

function randomItem(arr){

  if(!arr || !arr.length) return null;

  return arr[
    Math.floor(Math.random()*arr.length)
  ];

}

/* =====================================================
MEMÓRIA DE CONVERSA
===================================================== */

const MEMORY = new Map();

const MAX_TURNS = 8;

function getHistory(id){

  return MEMORY.get(id) || [];

}

function saveTurn(id,role,content){

  const h = getHistory(id);

  h.push({role,content});

  MEMORY.set(
    id,
    h.slice(-MAX_TURNS*2)
  );

}

/* =====================================================
MATCH INTENT CACHE
===================================================== */

function matchCacheIntent(text){

  const t = normalize(text);

  for(const item of IA_CACHE){

    if(!item.keywords) continue;

    for(const kw of item.keywords){

      if(t.includes(normalize(kw))){

        const reply =
          randomItem(item.replyTemplates);

        if(reply){

          return {
            reply,
            personaId:item.personaId || null
          };

        }

      }

    }

  }

  return null;

}

/* =====================================================
BUSCA NO CATÁLOGO
===================================================== */

function searchCatalog(text){

  const t = normalize(text);

  const results = [];

  for(const p of CATALOG_CACHE){

    const hay =
      normalize(p.title || "") +
      " " +
      normalize(p.subtitle || "") +
      " " +
      normalize((p.tags || []).join(" "));

    if(hay.includes(t)){

      results.push(p);

      if(results.length >= 3) break;

    }

  }

  return results;

}

/* =====================================================
PROMPT DA NAYLA
===================================================== */

function buildPrompt(persona){

  const tone =
    persona?.tone ||
    "amigável e consultivo";

  return `
Você é Nayla, assistente da Nexus Store.

Personalidade:
${persona?.label || "Assistente Nexus"}

Tom de voz:
${tone}

Objetivo:
Ajudar o usuário a descobrir produtos ou resolver dúvidas.

Regras:

- Seja natural.
- Não repita frases.
- Faça perguntas quando necessário.
- Sugira produtos quando fizer sentido.

Nunca responda como um robô.
`.trim();

}

/* =====================================================
ROUTER PRINCIPAL
===================================================== */

export async function routeMessage(message,context={}){

  const conversationId =
    context.conversationId || "guest";

  /* ===============================
  NORMALIZA TEXTO
  =============================== */

  const text =
    normalizeSlang(String(message || ""));

  /* ===============================
  DETECT INTENT
  =============================== */

  const intent = detectIntent(text);

  /* ===============================
  PERSONA
  =============================== */

  const persona = selectPersona(text);

  /* ===============================
  CACHE INTENT
  =============================== */

  const cached = matchCacheIntent(text);

  if(cached){

    return {
      reply: cached.reply,
      persona: cached.personaId,
      suggestions:[]
    };

  }

  /* ===============================
  BUSCA CATÁLOGO
  =============================== */

  const catalogMatches =
    searchCatalog(text);

  /* ===============================
  MEMÓRIA
  =============================== */

  const history =
    getHistory(conversationId);

  /* ===============================
  MONTA INPUT IA
  =============================== */

  const input = [

    {
      role:"system",
      content:buildPrompt(persona)
    },

    ...history,

    {
      role:"user",
      content:text
    }

  ];

  /* ===============================
  OPENAI FALLBACK
  =============================== */

  let reply = "";

  try{

    const resp =
      await client.responses.create({

      model:"gpt-4o-mini",

      input,

      temperature:0.8,

      max_output_tokens:220

    });

    reply =
      resp.output_text?.trim() ||
      "Pode explicar melhor o que você procura?";

  }
  catch(err){

    reply =
      "Pode explicar melhor o que você procura?";

  }

  /* ===============================
  SALVA MEMÓRIA
  =============================== */

  saveTurn(conversationId,"user",text);

  saveTurn(conversationId,"assistant",reply);

  /* ===============================
  SUGESTÕES DE PRODUTO
  =============================== */

  const suggestions =
    catalogMatches.map(p=>({

      id:p.id,
      title:p.title,
      price:p.price || null

    }));

  return {

    reply,
    suggestions

  };

}