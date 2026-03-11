import { searchCatalog } from "../utils/catalogCache.js";

/* ========================================
GLOBAL MEMORY
======================================== */

const CONTEXT = new Map();
const CACHE = new Map();
const LEARNING = [];

/* ========================================
UTIL
======================================== */

function now(){
  return Date.now();
}

function normalize(text=""){
  return String(text)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g," ")
  .replace(/\s+/g," ")
  .trim();
}

/* ========================================
SLANG NORMALIZER
======================================== */

const SLANG = {

 pc:["computador","setup","desktop","machine","rig"],

 comprar:["pegar","adquirir","buy"],

 jogar:["game","gaming","play"],

 caro:["expensive"],

 barato:["cheap","budget"]

};

function normalizeSlang(text){

 let t = String(text || "").toLowerCase();

 for(const key in SLANG){

  for(const word of SLANG[key]){

   const r = new RegExp(`\\b${word}\\b`,"g");

   t = t.replace(r,key);

  }

 }

 return t;

}

/* ========================================
SEMANTIC PARSER
======================================== */

function semanticParser(text){

 const t = text.toLowerCase();

 const result = {
  budget:null,
  use:null,
  intent:null
 };

 const mil = t.match(/(\d+)\s*(mil|k)/);

 if(mil){
  result.budget = Number(mil[1]) * 1000;
 }

 const dotted = t.match(/\d{1,3}(\.\d{3})+/);

 if(!result.budget && dotted){
  result.budget = Number(dotted[0].replace(/\./g,""));
 }

 const num = t.match(/\d{3,6}/);

 if(!result.budget && num){
  result.budget = Number(num[0]);
 }

 if(/valorant|cs|fortnite|fps|jogo/.test(t)){
  result.use="gaming";
 }

 if(/faculdade|estudo|programar/.test(t)){
  result.use="study";
 }

 if(/render|design|trabalho/.test(t)){
  result.use="work";
 }

 if(/pc|computador/.test(t)){
  result.intent="pc_build";
 }

 return result;

}

/* ========================================
CACHE
======================================== */

function getCache(key){

 const item = CACHE.get(key);

 if(!item) return null;

 if(now() > item.exp){
  CACHE.delete(key);
  return null;
 }

 return item.data;

}

function setCache(key,data){

 CACHE.set(key,{
  data,
  exp: now()+120000
 });

}
/* ========================================
CUSTOMER PROFILE
======================================== */

function detectCustomerType(text){

 const t = text.toLowerCase();

 if(/benchmark|latencia|clock|vrm/.test(t)){
  return "technical";
 }

 if(/comparar|qual melhor/.test(t)){
  return "analyst";
 }

 if(/quero comprar|vou pegar/.test(t)){
  return "buyer";
 }

 if(/nao sei|me ajuda/.test(t)){
  return "lost";
 }

 return "explorer";

}

/* ========================================
BUY INTENT
======================================== */

function detectBuyIntent(text){

 const t = text.toLowerCase();

 let score=0;

 if(/comprar|levar|pegar/.test(t)) score+=0.6;

 if(/preco|valor|quanto/.test(t)) score+=0.2;

 if(/agora|hoje/.test(t)) score+=0.2;

 return Math.min(score,1);

}

function salesStrategy(score){

 if(score < 0.3) return "explore";

 if(score < 0.7) return "assist";

 return "convert";

}

/* ========================================
NEURAL RANK
======================================== */

const NEURAL = {
 clicks:{},
 purchases:{},
 ignores:{}
};

function rankProducts(products){

 return products.sort((a,b)=>{

  const sa =
   (NEURAL.clicks[a.id]||0)*2+
   (NEURAL.purchases[a.id]||0)*5-
   (NEURAL.ignores[a.id]||0);

  const sb =
   (NEURAL.clicks[b.id]||0)*2+
   (NEURAL.purchases[b.id]||0)*5-
   (NEURAL.ignores[b.id]||0);

  return sb-sa;

 });

}

/* ========================================
PRODUCT MATCH
======================================== */

function matchProducts(products,ctx){

 if(!Array.isArray(products)) return [];

 const scored = products.map(p=>{

  let score=0;

  const name = (p.name||"").toLowerCase();

  if(ctx.use==="gaming" && /rtx|radeon|gtx/.test(name)) score+=5;

  if(ctx.use==="study" && /notebook/.test(name)) score+=4;

  if(ctx.budget){

   const diff = Math.abs(p.price-ctx.budget);

   score += Math.max(0,5-diff/1000);

  }

  return {p,score};

 });

 scored.sort((a,b)=>b.score-a.score);

 return scored.map(s=>s.p);

}
/* ========================================
CONTEXT
======================================== */

function getContext(id){

 if(!CONTEXT.has(id)){

  CONTEXT.set(id,{
   budget:null,
   use:null,
   stage:"discovery"
  });

 }

 return CONTEXT.get(id);

}

/* ========================================
ROUTER
======================================== */

export async function routeMessage(message,context={}){

 const id = context.conversationId || "guest";

 let ctx = getContext(id);

 const cached = getCache(message);

 if(cached){

  return {
   reply:cached,
   products:[],
   suggestions:[]
  };

 }

 const normalized = normalizeSlang(message);

 const parsed = semanticParser(normalized);

 if(parsed.budget) ctx.budget=parsed.budget;

 if(parsed.use) ctx.use=parsed.use;

 ctx.customerType = detectCustomerType(normalized);

 const buyScore = detectBuyIntent(normalized);

 ctx.salesStrategy = salesStrategy(buyScore);

 if(ctx.budget && ctx.use){
  ctx.stage="recommendation";
 }

 /* ===============================
RECOMMENDATION
=============================== */

 if(ctx.stage==="recommendation"){

  let products=[];

  if(ctx.use==="gaming"){
   products = searchCatalog("rtx");
  }

  if(ctx.use==="study"){
   products = searchCatalog("notebook");
  }

  if(ctx.use==="work"){
   products = searchCatalog("workstation");
  }

  products = rankProducts(products);

  products = matchProducts(products,ctx);

  if(products.length){

   const reply="Achei algumas opções boas para você 👇";

   setCache(message,reply);

   return {
    reply,
    products:products.slice(0,3),
    suggestions:[]
   };

  }

 }

 /* ===============================
QUESTIONS
=============================== */

 if(!ctx.budget){

  const reply="Você já tem um orçamento em mente?";

  setCache(message,reply);

  return {
   reply,
   products:[],
   suggestions:[]
  };

 }

 if(!ctx.use){

  const reply="Você pretende usar mais para jogos, estudo ou trabalho?";

  setCache(message,reply);

  return {
   reply,
   products:[],
   suggestions:[]
  };

 }

 return {
  reply:"Perfeito. Deixa eu ver algumas opções.",
  products:[],
  suggestions:[]
 };

}