import { searchCatalog } from "../utils/catalogCache.js";

/* ========================================
GLOBAL STATE
======================================== */

const CONTEXT = new Map();
const RESPONSE_CACHE = new Map();
const LEARNING = [];

const NEURAL = {
  clicks:{},
  purchases:{},
  ignores:{},
  conversations:{},
  successfulSuggestions:0
};

const MARKET = {
  searches:{},
  products:{},
  priceRanges:{}
};

/* ========================================
TIME / BASIC UTILS
======================================== */

function now(){
  return Date.now();
}

function safeString(value=""){
  return String(value ?? "");
}

function safeNumber(value, fallback=0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

function unique(arr=[]){
  return [...new Set(arr.filter(Boolean))];
}

function sum(arr=[]){
  return arr.reduce((acc,n)=>acc+safeNumber(n,0),0);
}

function average(arr=[]){
  if(!arr.length) return 0;
  return sum(arr)/arr.length;
}

/* ========================================
TEXT NORMALIZATION
======================================== */

function stripAccents(text=""){
  return safeString(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"");
}

function normalize(text=""){
  return stripAccents(text)
    .toLowerCase()
    .replace(/[_/\\|]+/g," ")
    .replace(/[^a-z0-9\s.,!?%$+-]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeHard(text=""){
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function tokenize(text=""){
  return normalizeHard(text).split(" ").filter(Boolean);
}

function hasAnyPattern(text="",patterns=[]){
  const t = normalizeHard(text);
  return patterns.some(pattern=>new RegExp(pattern,"i").test(t));
}

function includesAny(text="",terms=[]){
  const t = normalizeHard(text);
  return terms.some(term=>t.includes(normalizeHard(term)));
}

function escapeRegExp(text=""){
  return safeString(text).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}

/* ========================================
CACHE
======================================== */

function getResponseCache(key){

  const k = normalizeHard(key);
  const item = RESPONSE_CACHE.get(k);

  if(!item) return null;

  if(now() > item.exp){
    RESPONSE_CACHE.delete(k);
    return null;
  }

  return item.data;
}

function setResponseCache(key,data,ttlMs=60*1000){

  const k = normalizeHard(key);

  RESPONSE_CACHE.set(k,{
    data,
    exp: now()+ttlMs
  });
}

function clearExpiredCache(){

  const current = now();

  for(const [key,value] of RESPONSE_CACHE.entries()){
    if(current > value.exp){
      RESPONSE_CACHE.delete(key);
    }
  }
}

/* ========================================
TEXT REPAIR ENGINE
corrige abreviação, gíria curta e erro comum
======================================== */

const TEXT_REPAIR_MAP = {

  qro:"quero",
  qru:"quero",
  qr:"quero",
  qria:"queria",
  qriaa:"queria",
  ql:"qual",
  qnt:"quanto",
  qnts:"quantos",
  qnta:"quanta",
  qndo:"quando",
  qlqr:"qualquer",
  qqr:"qualquer",
  qq:"qualquer",
  pq:"porque",
  pque:"porque",
  pk:"porque",
  pkq:"porque",
  prq:"porque",
  vc:"voce",
  vce:"voce",
  vcs:"voces",
  c:"voce",
  ce:"voce",
  cmg:"comigo",
  ctg:"contigo",
  blz:"beleza",
  bllz:"beleza",
  deboa:"de boa",
  dboa:"de boa",
  flw:"falou",
  vlw:"valeu",
  obg:"obrigado",
  obgd:"obrigado",
  obgdo:"obrigado",
  obgda:"obrigada",
  pf:"por favor",
  pfv:"por favor",
  pls:"por favor",
  plz:"por favor",
  agr:"agora",
  agrr:"agora",
  hj:"hoje",
  dps:"depois",
  dpss:"depois",
  dnv:"de novo",
  msm:"mesmo",
  msmms:"mesmo",
  msmo:"mesmo",
  mt:"muito",
  mto:"muito",
  mta:"muita",
  mtos:"muitos",
  mds:"meu deus",
  slk:"caramba",
  slc:"caramba",
  tb:"tambem",
  tbm:"tambem",
  tmb:"tambem",
  td:"tudo",
  tds:"todos",
  tdbm:"tudo bem",
  n:"nao",
  nn:"nao",
  nnn:"nao",
  naoo:"nao",
  nnposso:"nao posso",
  ss:"sim",
  sss:"sim",
  s:"sim",
  pd:"pode",
  pdc:"pode crer",
  pde:"pode",
  tmj:"tamo junto",
  manoo:"mano",
  mn:"mano",
  mnn:"mano",
  irmao:"irmao",
  irmaoo:"irmao",
  parcero:"parceiro",
  parca:"parca",
  parcaa:"parca",
  pcgamer:"pc gamer",
  pczao:"pc",
  pczin:"pc",
  pczinho:"pc",
  pczinhu:"pc",
  note:"notebook",
  not:"notebook",
  ntb:"notebook",
  ntbk:"notebook",
  gpuu:"gpu",
  cpuu:"cpu",
  valrant:"valorant",
  vlorant:"valorant",
  vavalorant:"valorant",
  vava:"valorant",
  valo:"valorant",
  csgo:"cs2",
  cs:"cs2",
  ftn:"fortnite",
  fort:"fortnite",
  warz:"warzone",
  gta5:"gta 5",
  gtav:"gta 5",
  rdr2:"red dead redemption 2",
  mine:"minecraft",
  minezin:"minecraft",
  edicao:"edicao",
  ediçao:"edicao",
  edição:"edicao",
  programacao:"programacao",
  programação:"programacao",
  facul:"faculdade",
  trampo:"trabalho",
  trampar:"trabalho",
  trampos:"trabalho",
  job:"trabalho",
  jobs:"trabalho",
  custobeneficio:"custo beneficio",
  cxb:"custo beneficio",
  benecusto:"custo beneficio",
  topzera:"top",
  topzeira:"top",
  brabissimo:"brabo",
  fd:"forte",
  foda:"muito bom",
  monstrin:"monstro",
  monstrão:"monstro",
  insanooo:"insano",
  liso:"bem",
  rodeliso:"rodar liso",
  rodarbem:"rodar bem"
};

function repairWord(word=""){
  const normalizedWord = normalizeHard(word);

  if(TEXT_REPAIR_MAP[normalizedWord]){
    return TEXT_REPAIR_MAP[normalizedWord];
  }

  if(/^qro+$/.test(normalizedWord)) return "quero";
  if(/^vava+$/.test(normalizedWord)) return "valorant";
  if(/^mano+$/.test(normalizedWord)) return "mano";
  if(/^obg+d?a?$/.test(normalizedWord)) return "obrigado";
  if(/^vlw+$/.test(normalizedWord)) return "valeu";
  if(/^blz+$/.test(normalizedWord)) return "beleza";
  if(/^ss+$/.test(normalizedWord)) return "sim";
  if(/^nn+$/.test(normalizedWord)) return "nao";

  return word;
}

function repairText(text=""){

  const normalizedText = normalize(text);

  const repairedWords = normalizedText
    .split(" ")
    .filter(Boolean)
    .map(repairWord);

  let result = repairedWords.join(" ");

  result = result
    .replace(/\bto\b/g,"estou")
    .replace(/\btô\b/g,"estou")
    .replace(/\bta\b/g,"esta")
    .replace(/\btá\b/g,"esta")
    .replace(/\bpra\b/g,"para")
    .replace(/\bpro\b/g,"para o")
    .replace(/\bpros\b/g,"para os")
    .replace(/\bpras\b/g,"para as")
    .replace(/\bnum\b/g,"em um")
    .replace(/\bnaum\b/g,"nao")
    .replace(/\bvo fala\b/g,"vou falar")
    .replace(/\buso geral msm\b/g,"uso geral mesmo")
    .replace(/\bqquer\b/g,"qualquer")
    .replace(/\bqualqer\b/g,"qualquer")
    .replace(/\bqualq\b/g,"qualquer")
    .replace(/\s+/g," ")
    .trim();

  return result;
}

/* ========================================
SLANG NORMALIZER
muito mais completo
======================================== */

const SLANG_MAP = {

  oi: [
    "eae","e ai","eai","fala","fala ai","fala aí","salve","opa","yo",
    "sup","hey","hiya","hello","hi","hola","ola","alo",
    "oii","oiii","oiie","oiê","fala chefe","fala mano","fala parceiro",
    "fala meu mano","opa meu mano","opa mano","salve salve",
    "ya","heya","wassup","whatsup","whats up","hey bro","hello there",
    "やあ","こんにちは","привет","مرحبا"
  ],

  amigo: [
    "mano","bro","brother","parca","parça","parceiro","irmao","irmão",
    "dude","mate","my guy","bruh","man","home","chefe","patrao","patrão",
    "amigo","amiga","compa","compadre","camarada","consagrado",
    "parsa","parsao","fi","meu fi","filhao","filhão",
    "товарищ","друг"
  ],

  obrigado: [
    "valeu","vlw","tmj","brigado","brigada","obg","obrigado","obrigada",
    "thanks","thx","ty","tysm","thank you","gracias","arigato","ありがとう",
    "спасибо","شكرا"
  ],

  problema: [
    "bug","deu ruim","zoado","travou","quebrou","parou",
    "bugado","erro","error","glitch","lag","lagando","crash","crashou",
    "nao funciona","não funciona","nao vai","não vai","deu erro",
    "broken","issue","problem","defeito","deu problema","pau",
    "pau no sistema","travando","quebrando","ta ruim","tá ruim"
  ],

  comprar: [
    "pegar","adquirir","comprar","buy","purchase","get","grab","cop",
    "comprarlo","comprar eso","levar","vou levar","vou pegar",
    "fechar","fechar compra","fechar negocio","fechar negócio",
    "fechar a compra","passar no cartao","passar no cartão"
  ],

  barato: [
    "barato","baratinho","em conta","cheap","low price","budget",
    "economico","econômico","custo beneficio","custo-beneficio",
    "cost benefit","custo x beneficio","custo x benefício",
    "mais em conta","acessivel","acessível","basicao","basicão","basico",
    "mais barato","preco bom","preço bom","custo bom","custo baixo"
  ],

  caro: [
    "caro","muito caro","preco alto","preço alto","expensive",
    "overpriced","pricey","salgado","salgadinho","pesado no bolso"
  ],

  computador: [
    "pc","computador","setup","desktop","rig","gaming rig","machine",
    "build","maquina","máquina","cpu","pczinho","pc gamer","torre",
    "gabinete completo","maquina gamer","máquina gamer"
  ],

  gpu: [
    "placa de video","placa de vídeo","gpu","video card","graphics card",
    "vga","placa grafica","placa gráfica"
  ],

  cpu: [
    "processador","cpu","ryzen","intel","i5","i7","i9","r5","r7","r9"
  ],

  notebook: [
    "notebook","laptop","pc portatil","pc portátil","ultrabook","note"
  ],

  jogar: [
    "jogar","play","gaming","rodar jogo","run games","fps game",
    "rodar","rodar liso","joguinho","gamezinho","brincar","jogatina"
  ],

  legal: [
    "top","massa","daora","show","nice","cool","awesome",
    "dope","lit","fire","brabo","insano","animal","monstro",
    "foda","irado","sinistro","pesado","forte"
  ],

  comparar: [
    "comparar","comparacao","comparação","versus","vs","diferenca","diferença",
    "qual melhor","vale mais a pena","qual compensa","qual e melhor","qual é melhor"
  ],

  estudo: [
    "estudo","faculdade","facul","estudar","aula","curso","faculdadezinha"
  ],

  programar: [
    "programar","programacao","programação","codigo","código","dev","codar"
  ],

  trabalho: [
    "trabalho","trampar","trampar com","servico","serviço","job","trampar geral"
  ],

  render: [
    "render","renderizar","3d","arquitetura","edicao","edição","design",
    "blender","after effects","premiere","photoshop"
  ],

  urgente: [
    "agora","hoje","ja","já","urgente","imediato","o quanto antes"
  ],

  geral: [
    "qualquer coisa","pra tudo","para tudo","uso geral","geral",
    "dia a dia","de tudo","um pouco de tudo","uso misto","uso normal"
  ]
};

function applySlangMap(text=""){

  let t = normalize(text);

  for(const key in SLANG_MAP){

    const list = [...SLANG_MAP[key]].sort((a,b)=>b.length-a.length);

    for(const slang of list){

      const rg = new RegExp(`\\b${escapeRegExp(normalize(slang))}\\b`, "g");

      t = t.replace(rg,key);
    }
  }

  return t;
}

function normalizeSlang(text){

  const repaired = repairText(text);
  const mapped = applySlangMap(repaired);

  return normalizeHard(mapped);
}
/* ========================================
INTENT SIGNAL DATABASE
======================================== */

const INTENT_SIGNALS = {

 greeting:[
  "oi","ola","eae","fala","salve","opa","yo","hello"
 ],

 build_pc:[
  "pc","computador","setup","montar pc","build pc"
 ],

 buying:[
  "comprar","vou comprar","quero comprar","quanto custa",
  "preco","valor","vou pegar","vou levar"
 ],

 comparison:[
  "comparar","qual melhor","qual compensa","versus","vs"
 ],

 performance:[
  "rodar","fps","liso","alto desempenho","performance"
 ]

};

/* ========================================
GAME DATABASE
======================================== */

const GAME_DATABASE = {

 competitive:[
  "valorant","cs2","csgo","rainbow six","overwatch","apex"
 ],

 heavy:[
  "cyberpunk","starfield","alan wake","hogwarts legacy"
 ],

 casual:[
  "minecraft","fortnite","roblox","gta","gta5"
 ]

};

/* ========================================
HARDWARE DATABASE
======================================== */

const HARDWARE_PATTERNS = {

 gpu:/rtx\s?\d{3,4}|gtx\s?\d{3,4}|rx\s?\d{3,4}/i,

 cpu:/ryzen\s?\d|i3|i5|i7|i9/i,

 ram:/\d+\s?gb\s?ram/i,

 storage:/\d+\s?(gb|tb)\s?(ssd|hd)/i,

 monitor:/\d{2,3}\s?hz/i

};

/* ========================================
BUDGET ENGINE
======================================== */

function detectBudget(text){

 const t = normalizeHard(text);

 let budget=null;

 const mil = t.match(/(\d+)\s*(mil|k)/);

 if(mil){
  budget = Number(mil[1])*1000;
 }

 const dotted = t.match(/\d{1,3}(\.\d{3})+/);

 if(!budget && dotted){
  budget = Number(dotted[0].replace(/\./g,""));
 }

 const raw = t.match(/\b\d{3,6}\b/);

 if(!budget && raw){
  budget = Number(raw[0]);
 }

 if(!budget){

  if(/barato|basico/.test(t)) budget=2500;

  if(/medio|equilibrado/.test(t)) budget=4500;

  if(/forte|top|insano/.test(t)) budget=8000;

 }

 return budget;
}

/* ========================================
GAME DETECTION
======================================== */

function detectGame(text){

 const t = normalizeHard(text);

 for(const group in GAME_DATABASE){

  for(const game of GAME_DATABASE[group]){

   if(t.includes(game)){
    return {
     game,
     category:group
    };
   }

  }

 }

 return null;
}

/* ========================================
USE DETECTION
======================================== */

function detectUse(text){

 const t = normalizeHard(text);

 const uses=[];

 if(/jogar|gaming|fps|jogo/.test(t)) uses.push("gaming");

 if(/estudo|faculdade|curso/.test(t)) uses.push("study");

 if(/render|design|3d|arquitetura/.test(t)) uses.push("work");

 if(/programar|codigo|dev/.test(t)) uses.push("programming");

 if(/qualquer coisa|pra tudo|uso geral/.test(t)) uses.push("general");

 if(!uses.length) uses.push("general");

 return unique(uses);
}

/* ========================================
HARDWARE DETECTOR
======================================== */

function detectHardware(text){

 const hardware={};

 const t = normalizeHard(text);

 for(const key in HARDWARE_PATTERNS){

  const match = t.match(HARDWARE_PATTERNS[key]);

  if(match){
   hardware[key]=match[0];
  }

 }

 return hardware;
}

/* ========================================
INTENT DETECTOR
======================================== */

function detectIntent(text){

 const t = normalizeHard(text);

 const detected=[];

 for(const intent in INTENT_SIGNALS){

  for(const signal of INTENT_SIGNALS[intent]){

   if(t.includes(signal)){
    detected.push(intent);
   }

  }

 }

 if(!detected.length){
  return "conversation";
 }

 return detected[0];
}

/* ========================================
BUY STAGE DETECTOR
======================================== */

function detectBuyingStage(text){

 const t = normalizeHard(text);

 if(/quero comprar|vou comprar|vou levar/.test(t)){
  return "decision";
 }

 if(/quanto custa|preco|valor/.test(t)){
  return "evaluation";
 }

 if(/comparar|qual melhor/.test(t)){
  return "comparison";
 }

 return "exploration";
}

/* ========================================
USER LEVEL DETECTOR
======================================== */

function detectUserLevel(text){

 const t = normalizeHard(text);

 if(/vrm|latencia|benchmark|clock/.test(t)){
  return "expert";
 }

 if(/comparar|vale a pena/.test(t)){
  return "intermediate";
 }

 if(/me ajuda|nao sei/.test(t)){
  return "beginner";
 }

 return "normal";
}

/* ========================================
URGENCY DETECTOR
======================================== */

function detectUrgency(text){

 const t = normalizeHard(text);

 if(/agora|hoje|urgente|rapido/.test(t)){
  return "high";
 }

 if(/depois|talvez/.test(t)){
  return "low";
 }

 return "normal";
}

/* ========================================
CONFIDENCE ENGINE
======================================== */

function computeConfidence(ctx){

 let score=0;

 if(ctx.intent) score+=0.2;

 if(ctx.use) score+=0.2;

 if(ctx.budget) score+=0.2;

 if(ctx.hardware && Object.keys(ctx.hardware).length) score+=0.15;

 if(ctx.game) score+=0.15;

 if(ctx.buyStage) score+=0.1;

 return clamp(score,0,1);
}

/* ========================================
SEMANTIC PARSER
======================================== */

function semanticParser(text){

 const parsed={};

 parsed.budget = detectBudget(text);

 parsed.intent = detectIntent(text);

 parsed.use = detectUse(text);

 parsed.hardware = detectHardware(text);

 parsed.game = detectGame(text);

 parsed.buyStage = detectBuyingStage(text);

 parsed.userLevel = detectUserLevel(text);

 parsed.urgency = detectUrgency(text);

 return parsed;
}

/* ========================================
CONTEXT ENRICHMENT
======================================== */

function enrichContext(ctx,parsed){

 if(parsed.budget){
  ctx.budget = parsed.budget;
 }

 if(parsed.intent){
  ctx.intent = parsed.intent;
 }

 if(parsed.use){
  ctx.use = parsed.use;
 }

 if(parsed.game){
  ctx.game = parsed.game;
 }

 if(parsed.hardware){

  ctx.hardware={
   ...ctx.hardware,
   ...parsed.hardware
  };

 }

 ctx.buyStage = parsed.buyStage;

 ctx.userLevel = parsed.userLevel;

 ctx.urgency = parsed.urgency;

 ctx.confidence = computeConfidence(ctx);

 return ctx;
}
/* ========================================
CONVERSATION MEMORY CORE
======================================== */

function ensureContext(id){

 if(!CONTEXT.has(id)){

  CONTEXT.set(id,{
   stage:"discovery",
   history:[],
   knowledge:{},
   emotionalState:"neutral",
   curiosity:0,
   confusion:0,
   trust:0,
   loopCount:0,
   lastReply:null,
   productsShown:false
  });

 }

 return CONTEXT.get(id);

}

/* ========================================
MESSAGE STORAGE
======================================== */

function storeMessage(ctx,text){

 ctx.history.push({
  role:"user",
  text,
  time:Date.now()
 });

 if(ctx.history.length > 30){
  ctx.history.shift();
 }

}

/* ========================================
ASSISTANT MEMORY
======================================== */

function storeReply(ctx,text){

 ctx.history.push({
  role:"assistant",
  text,
  time:Date.now()
 });

 ctx.lastReply = text;

}

/* ========================================
FRUSTRATION DETECTOR
======================================== */

function detectFrustration(text){

 const t = normalizeHard(text);

 if(/nao entendeu|vc nao entendeu|voce nao entendeu/.test(t)) return true;

 if(/ta errado|errado/.test(t)) return true;

 if(/cara|mano.*(nao|n)/.test(t)) return true;

 if(/que merda|que porcaria/.test(t)) return true;

 return false;

}

/* ========================================
CONFUSION DETECTOR
======================================== */

function detectConfusion(text){

 const t = normalizeHard(text);

 if(/nao sei/.test(t)) return true;

 if(/to perdido/.test(t)) return true;

 if(/me ajuda/.test(t)) return true;

 return false;

}

/* ========================================
CONVERSATION LOOP DETECTOR
======================================== */

function detectLoop(ctx,newReply){

 if(!ctx.lastReply) return false;

 const last = normalizeHard(ctx.lastReply);
 const current = normalizeHard(newReply);

 if(last === current){

  ctx.loopCount++;

 }else{

  ctx.loopCount = 0;

 }

 if(ctx.loopCount > 2){

  ctx.loopCount = 0;

  return true;

 }

 return false;

}

/* ========================================
USER TRUST ENGINE
======================================== */

function updateTrust(ctx){

 if(ctx.history.length > 5){

  ctx.trust += 0.1;

 }

 ctx.trust = clamp(ctx.trust,0,1);

}

/* ========================================
CURIOSITY ENGINE
======================================== */

function updateCuriosity(ctx){

 if(!ctx.use) ctx.curiosity += 0.1;

 if(!ctx.budget) ctx.curiosity += 0.1;

 if(ctx.game && !ctx.hardware) ctx.curiosity += 0.1;

 ctx.curiosity = clamp(ctx.curiosity,0,1);

}

/* ========================================
PERSONA ENGINE
======================================== */

function selectPersona(ctx){

 if(ctx.userLevel === "expert") return "technical";

 if(ctx.emotionalState === "frustrated") return "support";

 if(ctx.buyStage === "decision") return "sales";

 if(ctx.curiosity > 0.6) return "explainer";

 return "friendly";

}

/* ========================================
EMOTION ENGINE
======================================== */

function updateEmotion(ctx,text){

 if(detectFrustration(text)){
  ctx.emotionalState="frustrated";
 }

 else if(detectConfusion(text)){
  ctx.emotionalState="confused";
 }

}

/* ========================================
HUMAN STYLE ENGINE
======================================== */

function humanizeReply(text){

 let t = text;

 t = t.replace(/qual seu orçamento/i,"quanto você pretende investir");
 t = t.replace(/qual uso/i,"o que você pretende fazer com ele");
 t = t.replace(/produto/i,"equipamento");

 return t;

}

/* ========================================
SALES STRATEGY ENGINE
======================================== */

function decideSalesStrategy(ctx){

 if(ctx.buyStage === "decision") return "close";

 if(ctx.buyStage === "evaluation") return "recommend";

 if(ctx.curiosity > 0.5) return "educate";

 return "explore";

}

/* ========================================
RECOMMENDATION STRATEGY
======================================== */

function chooseRecommendationStrategy(ctx){

 if(!ctx.budget) return "discover";

 if(ctx.budget < 3000) return "budget";

 if(ctx.budget < 7000) return "midrange";

 if(ctx.budget < 15000) return "highend";

 return "enthusiast";

}

/* ========================================
PRODUCT MATCH INTELLIGENCE
======================================== */

function matchProducts(products,ctx){

 if(!Array.isArray(products)) return [];

 const scored = products.map(p=>{

  let score = 0;

  const name = (p.name||"").toLowerCase();

  if(ctx.use?.includes("gaming") && /rtx|radeon|gtx/.test(name)){
   score += 5;
  }

  if(ctx.game){
   score += 2;
  }

  if(ctx.budget){

   const diff = Math.abs((p.price||0)-ctx.budget);

   score += Math.max(0,5-diff/1000);

  }

  if(ctx.userLevel === "expert"){
   score += 1;
  }

  return {p,score};

 });

 scored.sort((a,b)=>b.score-a.score);

 return scored.map(s=>s.p);

}

/* ========================================
LEARNING ENGINE
======================================== */

function learnFromConversation(ctx){

 const intent = ctx.intent || "unknown";

 if(!NEURAL.conversations[intent]){
  NEURAL.conversations[intent] = 0;
 }

 NEURAL.conversations[intent]++;

}

/* ========================================
SUGGESTION ENGINE
======================================== */

function generateSuggestions(ctx){

 const suggestions=[];

 if(!ctx.budget){
  suggestions.push("Quanto você pretende investir?");
 }

 if(!ctx.use){
  suggestions.push("Você pretende usar mais para jogos ou trabalho?");
 }

 if(ctx.game){
  suggestions.push("Quer focar mais em FPS ou qualidade gráfica?");
 }

 if(ctx.hardware?.gpu){
  suggestions.push("Quer montar o resto do PC em volta dessa GPU?");
 }

 return suggestions;

}

/* ========================================
CONVERSATION RECOVERY ENGINE
======================================== */

function recoverConversation(ctx){

 if(ctx.stage === "discovery" && ctx.budget && ctx.use){

  ctx.stage = "recommendation";

 }

 if(ctx.loopCount > 1){

  ctx.stage = "discovery";

 }

}

/* ========================================
REPLY GENERATOR
======================================== */

function generateReply(ctx){

 if(!ctx.budget){

  return "Boa! Me conta mais ou menos quanto você pretende investir no PC.";

 }

 if(!ctx.use){

  return "Legal. Você pretende usar mais para jogos, trabalho ou um pouco de tudo?";

 }

 if(ctx.stage === "recommendation"){

  return "Achei algumas opções que podem fazer bastante sentido para você 👇";

 }

 return "Perfeito. Deixa eu ver algumas opções para você.";

}
/* ========================================
CONTEXT ACCESS
======================================== */

function getContext(id){
 return ensureContext(id);
}

/* ========================================
NEURAL RANK ENGINE
======================================== */

function neuralRankProducts(products){
 return products || [];
}
/* ========================================
CATALOG SEARCH ENGINE
======================================== */

function findProducts(ctx){

 let products=[];

 if(ctx.use?.includes("gaming")){

  products = searchCatalog("gpu");

 }

 if(ctx.use?.includes("study")){

  products = searchCatalog("notebook");

 }

 if(ctx.use?.includes("work")){

  products = searchCatalog("workstation");

 }

 if(!products.length){

  products = searchCatalog("pc");

 }

 products = neuralRankProducts(products);

 products = matchProducts(products,ctx);

 return products.slice(0,3);

}

/* ========================================
PIPELINE EXECUTION
======================================== */

function runPipeline(ctx,message){

 const repaired = repairText(message);

 const normalized = normalizeSlang(repaired);

 const parsed = semanticParser(normalized);

 enrichContext(ctx,parsed);

 return normalized;

}

/* ========================================
STATE MANAGEMENT
======================================== */

function updateStage(ctx){

 if(ctx.budget && ctx.use){

  ctx.stage="recommendation";

 }

 if(ctx.productsShown){

  ctx.stage="decision";

 }

}
/* ========================================
EMOTION APPLY
======================================== */

function applyEmotion(reply,ctx){

  const persona = selectPersona(ctx);

  if(persona === "support"){
    return "Calma. " + reply;
  }

  if(persona === "sales"){
    return "Boa. " + reply;
  }

  if(persona === "technical"){
    return "Perfeito. " + reply;
  }

  if(persona === "explainer"){
    return "Tranquilo. " + reply;
  }

  return reply;
}

/* ========================================
NEURAL PRODUCT RANK
======================================== */

function neuralRankProducts(products=[]){

  if(!Array.isArray(products)) return [];

  return [...products].sort((a,b)=>{

    const sa =
      (NEURAL.clicks[a?.id] || 0) * 2 +
      (NEURAL.purchases[a?.id] || 0) * 5 -
      (NEURAL.ignores[a?.id] || 0);

    const sb =
      (NEURAL.clicks[b?.id] || 0) * 2 +
      (NEURAL.purchases[b?.id] || 0) * 5 -
      (NEURAL.ignores[b?.id] || 0);

    return sb - sa;
  });
}
/* ========================================
RESPONSE PIPELINE
======================================== */

function processConversation(ctx,message){

 storeMessage(ctx,message);

 updateEmotion(ctx,message);

 updateTrust(ctx);

 updateCuriosity(ctx);

 recoverConversation(ctx);

 const strategy = decideSalesStrategy(ctx);

 let reply = generateReply(ctx);

 if(strategy==="educate"){

  reply = "Boa pergunta. Vamos entender isso melhor.";

 }

 if(strategy==="recommend"){

  ctx.stage="recommendation";

 }

 if(strategy==="close"){

  reply = "Achei algo perfeito para você 👇";

 }

 reply = humanizeReply(reply);

 reply = applyEmotion(reply,ctx);

 return reply;

}

/* ========================================
FINAL RESPONSE BUILDER
======================================== */

function buildResponse(ctx,reply,products){

 const suggestions = generateSuggestions(ctx);

 return {
  reply,
  products,
  suggestions
 };

}

/* ========================================
MAIN ROUTER
======================================== */

export async function routeMessage(message,context={}){

  const id = context.conversationId || "guest";
  let ctx = getContext(id);

  const normalized = normalizeSlang(message);
  const parsed = semanticParser(normalized);

  if(parsed.budget) ctx.budget = parsed.budget;
  if(parsed.use) ctx.use = parsed.use;

  if(ctx.budget && ctx.use){
    ctx.stage = "recommendation";
  }

  let reply = null;
  let products = [];
  let suggestions = [];

  /* ===============================
  RECOMMENDATION
  =============================== */

  if(ctx.stage === "recommendation"){

    if(ctx.use === "gaming"){
      products = searchCatalog("rtx");
    }

    if(ctx.use === "study"){
      products = searchCatalog("notebook");
    }

    if(ctx.use === "work"){
      products = searchCatalog("workstation");
    }

    products = neuralRankProducts(products);
    products = matchProducts(products,ctx);

    if(products.length){
      reply = "Achei algumas opções boas para você 👇";
      products = products.slice(0,3);
    }
  }

  /* ===============================
  QUESTIONS
  =============================== */

  if(!reply && !ctx.budget){
    reply = "Você já tem um orçamento em mente?";
  }

  if(!reply && !ctx.use){
    reply = "Você pretende usar mais para jogos, estudo ou trabalho?";
  }

  /* ===============================
  FALLBACK FINAL
  =============================== */

  if(!reply){
    reply = "Perfeito. Deixa eu procurar algumas opções para você.";
  }

  return {
    reply,
    products,
    suggestions
  };

}
/* ========================================
LONG CONTEXT MEMORY
======================================== */

const LONG_MEMORY = {
 userProfiles:{},
 conversationPatterns:{}
};

function updateUserProfile(id,ctx){

 if(!LONG_MEMORY.userProfiles[id]){

  LONG_MEMORY.userProfiles[id] = {
   visits:0,
   interests:{},
   budgets:[]
  };

 }

 const profile = LONG_MEMORY.userProfiles[id];

 profile.visits++;

 if(ctx.use){

  for(const u of ctx.use){

   if(!profile.interests[u]){
    profile.interests[u]=0;
   }

   profile.interests[u]++;

  }

 }

 if(ctx.budget){

  profile.budgets.push(ctx.budget);

 }

}

/* ========================================
INTENT PROBABILITY ENGINE
======================================== */

function computeIntentProbabilities(ctx){

 const probs = {};

 probs.buy =
  (ctx.buyStage==="decision"?0.6:0) +
  (ctx.budget?0.2:0) +
  (ctx.use?0.2:0);

 probs.compare =
  ctx.intent==="comparison"?0.7:0.1;

 probs.explore =
  ctx.stage==="discovery"?0.6:0.2;

 return probs;

}

/* ========================================
INFERENCE ENGINE
deduz necessidades implícitas
======================================== */

function inferNeeds(ctx){

 const inferred={};

 if(ctx.game){

  inferred.gpuPriority=true;

 }

 if(ctx.use?.includes("gaming") && !ctx.hardware?.gpu){

  inferred.needsGPU=true;

 }

 if(ctx.budget && ctx.budget>8000){

  inferred.highPerformance=true;

 }

 if(ctx.use?.includes("work")){

  inferred.cpuPriority=true;

 }

 return inferred;

}

/* ========================================
REASONING ENGINE
simulação de raciocínio
======================================== */

function reasoningEngine(ctx){

 const reasoning=[];

 if(ctx.game){

  reasoning.push("user_wants_game_performance");

 }

 if(ctx.budget){

  reasoning.push("budget_detected");

 }

 if(ctx.use?.includes("gaming")){

  reasoning.push("gaming_build");

 }

 if(ctx.hardware?.gpu){

  reasoning.push("user_knows_gpu");

 }

 return reasoning;

}

/* ========================================
SMART QUESTION GENERATOR
======================================== */

function generateSmartQuestion(ctx){

 if(!ctx.budget){

  return "Para eu te recomendar algo bom, quanto você pretende investir no PC?";

 }

 if(!ctx.use){

  return "Você pretende usar mais para jogos, trabalho ou uso geral?";

 }

 if(ctx.game && !ctx.hardware?.gpu){

  return `Você quer rodar ${ctx.game.game} em FPS alto ou qualidade gráfica alta?`;

 }

 if(ctx.budget>10000 && ctx.use?.includes("gaming")){

  return "Você prefere focar em FPS competitivo ou gráfico ultra?";

 }

 return null;

}

/* ========================================
CONVERSATION DIRECTION ENGINE
======================================== */

function decideConversationDirection(ctx){

 const probs = computeIntentProbabilities(ctx);

 if(probs.buy > 0.7){

  return "push_recommendation";

 }

 if(probs.compare > 0.5){

  return "comparison_mode";

 }

 if(probs.explore > 0.5){

  return "exploration_mode";

 }

 return "normal";

}

/* ========================================
ADVANCED RECOVERY ENGINE
======================================== */

function deepConversationRecovery(ctx){

 if(ctx.loopCount>1){

  ctx.stage="discovery";

 }

 if(ctx.confusion>0.5){

  return "Vamos simplificar. Me conta primeiro quanto você pretende investir.";

 }

 return null;

}

/* ========================================
BEHAVIOR MODEL
======================================== */

function updateBehaviorModel(ctx){

 if(ctx.history.length>10){

  ctx.trust += 0.05;

 }

 if(ctx.productsShown){

  ctx.trust += 0.05;

 }

 ctx.trust = clamp(ctx.trust,0,1);

}

/* ========================================
SUPER RESPONSE ENGINE
======================================== */

function generateSuperReply(ctx){

 const direction = decideConversationDirection(ctx);

 if(direction==="push_recommendation"){

  return "Baseado no que você me contou, encontrei algumas opções muito boas 👇";

 }

 if(direction==="comparison_mode"){

  return "Boa pergunta. Vamos comparar algumas opções interessantes.";

 }

 if(direction==="exploration_mode"){

  return "Me conta um pouco mais do que você está procurando.";

 }

 return generateReply(ctx);

}
/* ========================================
INTENT RANKING ENGINE
======================================== */

function rankIntentProbability(ctx){

 const scores = {
  buy:0,
  explore:0,
  compare:0,
  learn:0
 };

 if(ctx.buyStage==="decision") scores.buy+=0.6;

 if(ctx.budget) scores.buy+=0.2;

 if(ctx.intent==="comparison") scores.compare+=0.7;

 if(ctx.stage==="discovery") scores.explore+=0.5;

 if(ctx.curiosity>0.5) scores.learn+=0.4;

 const ranked = Object.entries(scores)
  .sort((a,b)=>b[1]-a[1]);

 return ranked[0][0];
}

/* ========================================
NEXT MESSAGE PREDICTOR
======================================== */

function predictNextUserQuestion(ctx){

 if(!ctx.budget){
  return "user_will_talk_budget";
 }

 if(!ctx.use){
  return "user_will_explain_usage";
 }

 if(ctx.game && !ctx.hardware?.gpu){
  return "user_will_ask_gpu";
 }

 if(ctx.stage==="recommendation"){
  return "user_will_compare_products";
 }

 return "unknown";
}

/* ========================================
DIALOGUE DEPTH ENGINE
======================================== */

function computeDialogueDepth(ctx){

 const depth = ctx.history.length;

 if(depth < 4) return "surface";

 if(depth < 10) return "medium";

 return "deep";
}

/* ========================================
CONVERSATION PRIORITY ENGINE
======================================== */

function decideConversationPriority(ctx){

 const intent = rankIntentProbability(ctx);

 if(intent==="buy") return "sales";

 if(intent==="compare") return "comparison";

 if(intent==="learn") return "education";

 return "discovery";
}

/* ========================================
ADAPTIVE DIALOGUE STRATEGY
======================================== */

function adaptiveDialogueStrategy(ctx){

 const priority = decideConversationPriority(ctx);

 const depth = computeDialogueDepth(ctx);

 if(priority==="sales" && depth!=="surface"){
  return "push_recommendation";
 }

 if(priority==="comparison"){
  return "compare_products";
 }

 if(priority==="education"){
  return "explain_options";
 }

 return "ask_questions";
}

/* ========================================
SMART QUESTION TREE
======================================== */

function generateAdvancedQuestion(ctx){

 const prediction = predictNextUserQuestion(ctx);

 if(prediction==="user_will_talk_budget"){
  return "Quanto você pretende investir no PC?";
 }

 if(prediction==="user_will_explain_usage"){
  return "Você pretende usar mais para jogos, estudo ou trabalho?";
 }

 if(prediction==="user_will_ask_gpu"){
  return "Você prefere Nvidia ou AMD para a placa de vídeo?";
 }

 if(prediction==="user_will_compare_products"){
  return "Quer que eu compare algumas opções para você?";
 }

 return null;
}

/* ========================================
USER BEHAVIOR MODEL
======================================== */

function analyzeUserBehavior(ctx){

 const behavior = {
  technical:false,
  priceSensitive:false,
  performanceFocused:false
 };

 if(ctx.userLevel==="expert"){
  behavior.technical=true;
 }

 if(ctx.budget && ctx.budget < 3000){
  behavior.priceSensitive=true;
 }

 if(ctx.use?.includes("gaming")){
  behavior.performanceFocused=true;
 }

 return behavior;
}

/* ========================================
DECISION ENGINE
======================================== */

function decideNextAction(ctx){

 const strategy = adaptiveDialogueStrategy(ctx);

 if(strategy==="push_recommendation"){
  return "show_products";
 }

 if(strategy==="compare_products"){
  return "compare_products";
 }

 if(strategy==="explain_options"){
  return "explain";
 }

 return "ask";
}

/* ========================================
SUPER RESPONSE BUILDER
======================================== */

function generateGodReply(ctx){

 const action = decideNextAction(ctx);

 if(action==="show_products"){
  return "Baseado no que você me contou, encontrei algumas opções muito interessantes 👇";
 }

 if(action==="compare_products"){
  return "Vamos comparar algumas opções boas para você.";
 }

 if(action==="explain"){
  return "Deixa eu te explicar rapidamente as melhores opções para esse caso.";
 }

 const question = generateAdvancedQuestion(ctx);

 if(question) return question;

 return generateReply(ctx);
}
/* ========================================
EVOLUTION MEMORY
======================================== */

const EVOLUTION = {
 intents:{},
 products:{},
 replies:{},
 conversations:0
};

/* ========================================
LEARN INTENT
======================================== */

function learnIntent(intent){

 if(!intent) return;

 if(!EVOLUTION.intents[intent]){
  EVOLUTION.intents[intent]=0;
 }

 EVOLUTION.intents[intent]++;

}

/* ========================================
LEARN PRODUCT INTEREST
======================================== */

function learnProduct(productId){

 if(!productId) return;

 if(!EVOLUTION.products[productId]){
  EVOLUTION.products[productId]=0;
 }

 EVOLUTION.products[productId]++;

}

/* ========================================
LEARN REPLY SUCCESS
======================================== */

function learnReply(reply){

 if(!reply) return;

 if(!EVOLUTION.replies[reply]){
  EVOLUTION.replies[reply]=0;
 }

 EVOLUTION.replies[reply]++;

}

/* ========================================
CONVERSATION LEARNING
======================================== */

function learnConversation(ctx){

 EVOLUTION.conversations++;

 if(ctx.intent){
  learnIntent(ctx.intent);
 }

 if(ctx.lastProduct){
  learnProduct(ctx.lastProduct);
 }

 if(ctx.lastReply){
  learnReply(ctx.lastReply);
 }

}

/* ========================================
POPULAR PRODUCT ENGINE
======================================== */

function getPopularProducts(){

 const ranked = Object.entries(EVOLUTION.products)
  .sort((a,b)=>b[1]-a[1])
  .slice(0,5);

 return ranked.map(r=>r[0]);
}

/* ========================================
INTELLIGENCE BOOST
======================================== */

function applyEvolutionBoost(products){

 if(!products) return products;

 const popular = getPopularProducts();

 return products.sort((a,b)=>{

  const sa = popular.includes(a.id) ? 2 : 0;
  const sb = popular.includes(b.id) ? 2 : 0;

  return sb-sa;

 });

}

/* ========================================
SMART LEARNING HOOK
======================================== */

function evolutionHook(ctx,reply){

 ctx.lastReply = reply;

 learnConversation(ctx);

}
/* ========================================
CUSTOMER TYPE DETECTOR
======================================== */

function detectCustomerType(text=""){

 const t = String(text).toLowerCase();

 if(/benchmark|latencia|clock|vrm|chipset|fps|spec/.test(t)){
  return "technical";
 }

 if(/comparar|qual melhor|vale a pena|diferença/.test(t)){
  return "analyst";
 }

 if(/quero comprar|vou comprar|vou pegar|vou levar|fechar compra/.test(t)){
  return "buyer";
 }

 if(/nao sei|não sei|to perdido|me ajuda|qual escolher/.test(t)){
  return "lost";
 }

 return "explorer";
}