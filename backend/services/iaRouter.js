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
  obrigado:["valeu","tmj"]

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
INTENT RÁPIDO
=============================== */

const FAST_INTENTS = [

{
keywords:["oi","ola","bom dia","boa tarde","boa noite"],
reply:[
"Oi! Eu sou a Nayla 👋 Como posso ajudar?",
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

const MAX_TURNS = 6;

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
BUSCA CATÁLOGO
=============================== */

function scoreMatch(query,item){

  const q = normalize(query);

  const hay =
    normalize(item.title||"") +
    " " +
    normalize(item.subtitle||"") +
    " " +
    normalize((item.tags||[]).join(" "));

  const words = q.split(" ").filter(Boolean);

  let hits = 0;

  for(const w of words){

    if(w.length<2) continue;

    if(hay.includes(w)) hits++;

  }

  if(hay.includes(q)) hits+=3;

  return hits;

}

function pickCatalogMatches(message,limit=3){

  const catalog = loadCatalog();

  return catalog
  .map(p=>({p,s:scoreMatch(message,p)}))
  .filter(x=>x.s>0)
  .sort((a,b)=>b.s-a.s)
  .slice(0,limit)
  .map(x=>x.p);

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

Objetivo:

Ajudar clientes a escolher produtos.

Regras:

- Fale de forma natural.
- Entenda frases mal escritas.
- Nunca repita a mesma frase várias vezes.
- Se o usuário estiver perdido, sugira ideias.

Exemplo de ajuda:

"Se você quer um PC, posso sugerir:

• PC gamer
• PC para estudo
• PC custo-benefício

Ou podemos escolher peça por peça."

Sempre seja amigável.
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
"Legal! Você quer montar um PC ou comprar um já pronto?\n\nPosso te ajudar com:\n\n• PC gamer\n• PC para trabalho\n• PC custo-benefício",
      suggestions:[]
    };

  }

  if(simpleIntent==="gpu"){

    return {
      reply:
"Boa! Placa de vídeo é para jogar, trabalhar ou os dois?",
      suggestions:[]
    };

  }

  const history = getHistory(conversationId);

  const matches = pickCatalogMatches(text,3);

  let catalogBlock="";

  if(matches.length){

    catalogBlock = matches
    .map(p=>`${p.title}`)
    .join("\n");

  }

  const input=[

    {role:"system",content:buildSystemPrompt()},

    ...history,

    {role:"user",content:text}

  ];

  const resp = await client.responses.create({

    model:"gpt-4o-mini",

    input,

    temperature:0.7,

    max_output_tokens:200

  });

  const reply =
  resp.output_text?.trim()
  ||
  "Pode explicar um pouco melhor o que você quer encontrar?";

  saveTurn(conversationId,"user",text);

  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    suggestions:[]
  };

}