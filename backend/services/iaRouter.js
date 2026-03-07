import fs from "fs";
import path from "path";
import OpenAI from "openai";

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

try{

  const cachePath = path.resolve("backend/data/ia_cache_base.json");

  if(fs.existsSync(cachePath)){

    const raw = fs.readFileSync(cachePath,"utf-8");
    const json = JSON.parse(raw);

    if(Array.isArray(json)){
      IA_CACHE = json;
    }

  }

}catch(err){

  console.error("Erro carregando IA cache:",err);

}

/* ===============================
MEMÓRIA CONVERSA
=============================== */

const MEMORY = new Map();

const MAX_TURNS = 10;

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

/* ===============================
MATCH CACHE
=============================== */

function matchCacheIntent(text){

  const lower = text.toLowerCase();

  for(const item of IA_CACHE){

    for(const kw of item.keywords){

      if(lower.includes(kw.toLowerCase())){

        const replies = item.replyTemplates;

        if(!replies || !replies.length) continue;

        return replies[
          Math.floor(Math.random()*replies.length)
        ];

      }

    }

  }

  return null;

}

/* ===============================
PROMPT SYSTEM
=============================== */

function buildSystemPrompt(persona){

  const personaContext = persona
  ? `
Persona ativa: ${persona.label}

Função: ${persona.role}

Descrição: ${persona.description}

Tom:
${persona.tone}

Estilo de comunicação:
${(persona.communicationStyle || []).join(", ")}

Comportamento esperado:
${(persona.behavior || []).join(", ")}

`
  : "";

return `
Você é Nayla, assistente da Nexus Store.

${personaContext}

Regras:

- Converse como uma pessoa real
- Entenda frases mal escritas
- Seja natural
- Ajude o cliente a descobrir o que quer
- Nunca responda de forma robótica
- Nunca repita a mesma frase

Seu objetivo é ajudar o usuário a comprar ou descobrir produtos.
`.trim();

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  /* ===============================
  NORMALIZAÇÃO
  =============================== */

  const text = normalizeSlang(message);

  /* ===============================
  INTENT MATCHER
  =============================== */

  const intent = detectIntent(text);

  if(intent){

    const replies = intent.replyTemplates;

    if(replies && replies.length){

      return{
        reply: replies[
          Math.floor(Math.random()*replies.length)
        ],
        suggestions:[]
      };

    }

  }

  /* ===============================
  CACHE BASE MATCH
  =============================== */

  const cached = matchCacheIntent(text);

  if(cached){

    return{
      reply:cached,
      suggestions:[]
    };

  }

  /* ===============================
  PERSONA SELECTOR
  =============================== */

  const persona = selectPersona(text);

  /* ===============================
  OPENAI IA
  =============================== */

  const history = getHistory(conversationId);

  const input=[

    {
      role:"system",
      content: buildSystemPrompt(persona)
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

      temperature:0.85,

      max_output_tokens:260

    });

    reply =
      resp.output_text?.trim()
      ||
      "Pode explicar melhor o que você procura?";

  }catch(err){

    console.error("Erro OpenAI:",err);

    reply="Pode explicar melhor o que você procura?";

  }

  /* ===============================
  MEMÓRIA
  =============================== */

  saveTurn(conversationId,"user",text);
  saveTurn(conversationId,"assistant",reply);

  return{
    reply,
    suggestions:[]
  };

}