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
MEMÓRIA CONVERSA
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
CACHE MATCH (FORTE)
=============================== */

function matchCacheIntent(text){

  const t = normalize(text);

  for(const item of IA_CACHE){

    let score = 0;

    /* KEYWORDS */

    if(item.keywords){

      for(const kw of item.keywords){

        const k = normalize(kw);

        if(t.includes(k)){
          score += 3;
        }

      }

    }

    /* USER EXAMPLES */

    if(item.userExamples){

      for(const ex of item.userExamples){

        const e = normalize(ex);

        if(t.includes(e)){
          score += 5;
        }

      }

    }

    if(score > 0){

      const replies = item.replyTemplates;

      if(!replies || !replies.length) continue;

      return replies[
        Math.floor(Math.random()*replies.length)
      ];

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

Nome: ${persona.label}

Função: ${persona.role}

Tom: ${persona.tone}

Descrição: ${persona.description}

`;

  }

  let intentBlock = "";

  if(intent){

    intentBlock = `

INTENÇÃO DETECTADA:

${intent.intent}

`;

  }

  return `
Você é Nayla, assistente da Nexus Store.

Objetivo:

Ajudar clientes a escolher produtos e montar setups.

Regras:

- Converse de forma natural
- Não repita respostas
- Faça perguntas quando necessário
- Ajude o cliente a decidir

${personaBlock}

${intentBlock}

Responda como uma assistente real de loja.

`.trim();

}

/* ===============================
ROUTER PRINCIPAL
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const normalizedMessage = normalizeSlang(message);

  /* ===============================
  1 CACHE MATCH (RÁPIDO)
  =============================== */

  const cachedReply = matchCacheIntent(normalizedMessage);

  if(cachedReply){

    saveTurn(conversationId,"user",normalizedMessage);
    saveTurn(conversationId,"assistant",cachedReply);

    return {
      reply:cachedReply,
      suggestions:[]
    };

  }

  /* ===============================
  2 INTENT MATCHER
  =============================== */

  const intent = detectIntent(normalizedMessage);

  /* ===============================
  3 PERSONA SELECTOR
  =============================== */

  const persona = selectPersona(normalizedMessage);

  /* ===============================
  4 OPENAI FALLBACK
  =============================== */

  const history = getHistory(conversationId);

  const input=[

    {
      role:"system",
      content:buildPrompt(persona,intent)
    },

    ...history,

    {
      role:"user",
      content:normalizedMessage
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

  saveTurn(conversationId,"user",normalizedMessage);
  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}