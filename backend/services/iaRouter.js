// backend/services/iaRouter.js

import fs from "fs";
import path from "path";
import OpenAI from "openai";

import { detectIntent } from "../services/intentMatcher.js";
import { selectPersona } from "../services/personaSelector.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
CARREGAMENTO GLOBAL (1 VEZ)
=============================== */

let IA_CACHE = [];

try{

  const iaCachePath = path.resolve("backend/data/ia_cache_base.json");

  if(fs.existsSync(iaCachePath)){

    const raw = fs.readFileSync(iaCachePath,"utf-8");
    const json = JSON.parse(raw);

    if(Array.isArray(json)){
      IA_CACHE = json;
    }

  }

}catch(err){

  console.error("Erro carregando cache IA:",err);

}

/* ===============================
NORMALIZAÇÃO
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
MEMÓRIA
=============================== */

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

/* ===============================
MATCH INTENT CACHE
=============================== */

function matchCacheIntent(text){

  const t = normalize(text);

  for(const item of IA_CACHE){

    if(!item.keywords) continue;

    for(const kw of item.keywords){

      const k = normalize(kw);

      if(t.includes(k)){

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
PROMPT BUILDER
=============================== */

function buildSystemPrompt(persona){

  let personaBlock = "";

  if(persona){

    personaBlock = `
Persona ativa: ${persona.label}

Função:
${persona.description}

Tom:
${persona.tone}

Estilo de comunicação:
${persona.communicationStyle?.join(", ") || ""}
`;

  }

return `
Você é Nayla, assistente da Nexus Store.

${personaBlock}

Objetivo:
Ajudar clientes a descobrir produtos e tomar decisões.

Regras:

- Entenda frases mal escritas
- Seja natural
- Não repita respostas
- Faça perguntas quando necessário
- Ajude o cliente a decidir

Exemplo:

Usuário: quero algo para programar

Resposta:
"Boa! Para programar geralmente notebooks com bastante RAM e SSD ajudam bastante. Você prefere notebook ou PC?"

Converse naturalmente.
`.trim();

}

/* ===============================
ROUTER PRINCIPAL
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalize(message);

  /* ===============================
  CACHE INTENT
  =============================== */

  const cacheReply = matchCacheIntent(text);

  if(cacheReply){

    return {
      reply: cacheReply,
      suggestions: []
    };

  }

  /* ===============================
  INTENT DETECTOR
  =============================== */

  const intent = detectIntent(text);

  if(intent && intent.replyTemplates){

    const reply =
      intent.replyTemplates[
        Math.floor(Math.random()*intent.replyTemplates.length)
      ];

    return {
      reply,
      suggestions:[]
    };

  }

  /* ===============================
  PERSONA SELECTOR
  =============================== */

  const persona = selectPersona(text);

  /* ===============================
  HISTÓRICO
  =============================== */

  const history = getHistory(conversationId);

  const input = [

    { role:"system", content: buildSystemPrompt(persona) },

    ...history,

    { role:"user", content: text }

  ];

  let reply="";

  try{

    const resp = await client.responses.create({

      model:"gpt-4o-mini",

      input,

      temperature:0.7,

      max_output_tokens:240

    });

    reply =
      resp.output_text?.trim()
      ||
      "Pode explicar melhor o que você procura?";

  }catch(err){

    console.error("Erro IA:",err);

    reply = "Pode explicar melhor o que você procura?";

  }

  saveTurn(conversationId,"user",text);
  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}