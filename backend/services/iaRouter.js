// backend/services/iaRouter.js

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
CARREGAMENTO GLOBAL (1 VEZ)
=============================== */

let CATALOG_CACHE = [];
let IA_CACHE = [];

try {

  const catalogPath = path.resolve("backend/data/catalogo.json");
  const iaCachePath = path.resolve("backend/data/ia_cache_base.json");

  if (fs.existsSync(catalogPath)) {
    const raw = fs.readFileSync(catalogPath,"utf-8");
    const json = JSON.parse(raw);
    if(Array.isArray(json)) CATALOG_CACHE = json;
  }

  if (fs.existsSync(iaCachePath)) {
    const raw = fs.readFileSync(iaCachePath,"utf-8");
    const json = JSON.parse(raw);
    if(Array.isArray(json)) IA_CACHE = json;
  }

} catch(err){
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
SLANG
=============================== */

const SLANG_MAP = {

  pc:["computador","setup"],
  placa:["gpu","placa de video","placa de vídeo"],
  notebook:["laptop"],
  comprar:["pegar","adquirir"],
  oi:["eae","fala","salve","opa","yo"],
  obrigado:["valeu","tmj"],
  saber:["qro","qro saber","qra","qria","queria","quero saber"],
  nao:["n","num","naum"],
  quero:["qro","qru","qero"]

};

function normalizeSlang(text){

  let t = normalize(text);

  for(const key in SLANG_MAP){

    for(const slang of SLANG_MAP[key]){

      const rg = new RegExp(`\\b${slang}\\b`,"g");

      t = t.replace(rg,key);

    }

  }

  return t;

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
INTENT CACHE MATCH
=============================== */

function matchIntent(text){

  const t = normalize(text);

  for(const item of IA_CACHE){

    for(const kw of item.keywords){

      if(t.includes(normalize(kw))){

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
PROMPT
=============================== */

function buildSystemPrompt(){

return `
Você é Nayla, assistente da Nexus Store.

Objetivo:
Conversar naturalmente e ajudar clientes a descobrir produtos.

Regras:

- Entenda frases mal escritas
- Não repita frases iguais
- Ajude o cliente a decidir
- Seja natural

Exemplo:

Usuário: quero algo para programar

Resposta:
"Boa! Para programar geralmente notebooks com bastante RAM e SSD ajudam bastante. Você prefere notebook ou PC?"

Converse como uma pessoa.
`.trim();

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalizeSlang(message);

  /* ===============================
  INTENT CACHE
  =============================== */

  const cached = matchIntent(text);

  if(cached){

    return {
      reply:cached,
      suggestions:[]
    };

  }

  /* ===============================
  IA OPENAI
  =============================== */

  const history = getHistory(conversationId);

  const input=[

    {role:"system",content:buildSystemPrompt()},

    ...history,

    {role:"user",content:text}

  ];

  let reply="";

  try{

    const resp = await client.responses.create({

      model:"gpt-4o-mini",

      input,

      temperature:0.8,

      max_output_tokens:220

    });

    reply =
      resp.output_text?.trim()
      ||
      "Pode explicar melhor o que você procura?";

  }catch{

    reply = "Pode explicar melhor o que você procura?";

  }

  saveTurn(conversationId,"user",text);

  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}