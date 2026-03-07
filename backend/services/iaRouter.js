// backend/services/iaRouter.js

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
CACHE CATÁLOGO
=============================== */

let CATALOG_CACHE = null;

function loadCatalog() {

  if (CATALOG_CACHE) return CATALOG_CACHE;

  try {

    const filePath = path.resolve("backend/data/catalogo.json");

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    CATALOG_CACHE = Array.isArray(json) ? json : [];

    return CATALOG_CACHE;

  } catch {

    return [];

  }

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
GÍRIAS
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
INTENTS RÁPIDOS
=============================== */

const FAST_INTENTS = [

{
keywords:["oi","ola","bom dia","boa tarde","boa noite"],
reply:[
"Oi! Eu sou a Nayla 👋 Como posso te ajudar hoje?",
"E aí! 👋 Sou a Nayla da Nexus. O que você procura hoje?"
]
},

{
keywords:["obrigado","valeu"],
reply:[
"Imagina! Qualquer coisa só chamar.",
"Tamo junto! Se precisar de algo mais é só falar."
]
}

];

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
INTENT SIMPLES
=============================== */

function detectSimpleIntent(text){

  const t = normalize(text);

  if(t.includes("pc") || t.includes("computador"))
    return "pc";

  if(t.includes("placa"))
    return "gpu";

  if(t.includes("notebook"))
    return "notebook";

  return null;

}

/* ===============================
PROMPT
=============================== */

function buildSystemPrompt(){

return `
Você é Nayla, assistente da Nexus Store.

Seu trabalho é conversar naturalmente com o usuário e ajudar ele a descobrir o que quer comprar.

Regras:

- Entenda frases mal escritas.
- Nunca repita exatamente a mesma frase.
- Se o usuário estiver indeciso, ajude ele a descobrir o que quer.
- Seja natural, como uma pessoa conversando.

Exemplo:

Usuário: "quero algo pra programar"

Resposta:
"Boa! Para programar geralmente um PC com bastante RAM e SSD ajuda bastante. Você prefere notebook ou computador de mesa?"

Sempre mantenha conversa fluida.
`.trim();

}

/* ===============================
FAST INTENT
=============================== */

function checkFastIntent(text){

  const t = normalize(text);

  for(const intent of FAST_INTENTS){

    for(const kw of intent.keywords){

      if(t.includes(kw)){

        const r = intent.reply[
          Math.floor(Math.random()*intent.reply.length)
        ];

        return r;

      }

    }

  }

  return null;

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalizeSlang(message);

  const fast = checkFastIntent(text);

  if(fast){

    return {
      reply:fast,
      suggestions:[]
    };

  }

  const simpleIntent = detectSimpleIntent(text);

  if(simpleIntent==="pc"){

    return {
      reply:
"Beleza! Você quer um PC mais para **programação**, **jogos** ou **uso geral**?\n\nSe quiser, posso também sugerir algumas configurações boas.",
      suggestions:[]
    };

  }

  if(simpleIntent==="gpu"){

    return {
      reply:
"Boa! Você está procurando uma placa de vídeo para **jogar**, **trabalhar** ou os dois?",
      suggestions:[]
    };

  }

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
      "Pode explicar um pouco melhor o que você procura?";

  }catch{

    reply = "Pode explicar um pouco melhor o que você procura?";

  }

  saveTurn(conversationId,"user",text);

  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}