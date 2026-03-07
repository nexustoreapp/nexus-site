// backend/services/iaRouter.js

import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ======================================================
CATÁLOGO GLOBAL
Carrega todas as categorias em /backend/data/catalog
====================================================== */

let PRODUCT_INDEX = [];

function loadCatalog(){

  try{

    const catalogDir = path.resolve("backend/data/catalog");

    const files = fs.readdirSync(catalogDir);

    const products = [];

    for(const file of files){

      if(!file.endsWith(".json")) continue;

      const full = path.join(catalogDir,file);

      const raw = fs.readFileSync(full,"utf-8");

      const json = JSON.parse(raw);

      if(Array.isArray(json)){

        for(const p of json){

          products.push({
            id: p.id || "",
            title: p.title || "",
            subtitle: p.subtitle || "",
            category: file.replace(".json",""),
            price: p.price || p.pricePublic || null,
            tags: p.tags || []
          });

        }

      }

    }

    PRODUCT_INDEX = products;

    console.log("CATALOGO IA:",PRODUCT_INDEX.length,"produtos");

  }catch(err){

    console.error("Erro carregando catalogo:",err);

  }

}

loadCatalog();

/* ======================================================
NORMALIZAÇÃO
====================================================== */

function normalize(text=""){

  return text
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g," ")
  .replace(/\s+/g," ")
  .trim();

}

/* ======================================================
BUSCA PRODUTO
====================================================== */

function searchProducts(query,limit=3){

  const q = normalize(query);

  if(!q) return [];

  const results = [];

  for(const p of PRODUCT_INDEX){

    const hay =
      normalize(p.title) + " " +
      normalize(p.subtitle) + " " +
      normalize(p.category) + " " +
      normalize((p.tags||[]).join(" "));

    if(hay.includes(q)){

      results.push(p);

    }

  }

  return results.slice(0,limit);

}

/* ======================================================
MEMÓRIA CONVERSA
====================================================== */

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

/* ======================================================
PROMPT
====================================================== */

function buildSystemPrompt(){

return `
Você é Nayla, assistente da Nexus Store.

Seu trabalho:

1 ajudar o cliente
2 entender o que ele quer comprar
3 sugerir produtos quando possível

Regras:

- fale como pessoa real
- nunca repita frases
- sempre tente descobrir orçamento
- se possível sugira produtos

Exemplo:

Cliente:
quero montar um pc

Resposta:
Boa! Qual orçamento você tem mais ou menos?
Assim consigo sugerir peças que façam sentido.
`;

}

/* ======================================================
ROUTER
====================================================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalize(message);

  /* =====================================
  BUSCA PRODUTOS
  ==================================== */

  const products = searchProducts(text,3);

  let catalogContext = "";

  if(products.length){

    const lines = products.map(p=>{

      return `${p.title} (${p.category})`;

    });

    catalogContext =
`
PRODUTOS RELEVANTES:

${lines.join("\n")}
`;

  }

  /* =====================================
  IA
  ==================================== */

  const history = getHistory(conversationId);

  const input=[

    {role:"system",content:buildSystemPrompt()},

    ...(catalogContext ? [{role:"system",content:catalogContext}] : []),

    ...history,

    {role:"user",content:text}

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

  }catch{

    reply="Pode explicar melhor o que você procura?";

  }

  saveTurn(conversationId,"user",text);

  saveTurn(conversationId,"assistant",reply);

  return {

    reply,

    suggestions: products.map(p=>({

      id:p.id,
      title:p.title,
      price:p.price

    }))

  };

}