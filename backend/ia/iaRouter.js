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
  conversations:{}
};

const MARKET = {
  searches:{},
  products:{},
  priceRanges:{}
};

/* ========================================
UTILS
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

function tokenize(text=""){
  return normalize(text).split(" ").filter(Boolean);
}

function unique(arr=[]){
  return [...new Set(arr.filter(Boolean))];
}

function safeNumber(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ========================================
CACHE
======================================== */

function getResponseCache(key){

  const normalizedKey = normalize(key);
  const item = RESPONSE_CACHE.get(normalizedKey);

  if(!item) return null;

  if(now() > item.exp){
    RESPONSE_CACHE.delete(normalizedKey);
    return null;
  }

  return item.data;
}

function setResponseCache(key,data,ttlMs=60*1000){

  const normalizedKey = normalize(key);

  RESPONSE_CACHE.set(normalizedKey,{
    data,
    exp: now() + ttlMs
  });
}

/* ========================================
SLANG NORMALIZER
======================================== */

const SLANG_MAP = {

  oi: [
    "eae","e ai","eai","fala","fala ai","fala aí","salve","opa","yo",
    "sup","hey","hiya","hello","hi","hola","ola","alo",
    "yo bro","yo man","yo dude",
    "oii","oiii","oiie","oiê",
    "ya","heya","wassup","whatsup","whats up",
    "やあ","こんにちは","привет","مرحبا"
  ],

  amigo: [
    "mano","bro","brother","parca","parça","parceiro","irmao","irmão",
    "dude","mate","my guy","bruh","man","home","chefe","patrao","patrão",
    "amigo","amiga","compa","compadre","camarada","consagrado",
    "товарищ","друг"
  ],

  obrigado: [
    "valeu","vlw","tmj","brigado","brigada","obg","obrigado","obrigada",
    "thanks","thx","ty","tysm","thank you","gracias","arigato","ありがとう",
    "спасибо","شكرا"
  ],

  problema: [
    "bug","deu ruim","zoado","travou","quebrou","parou",
    "bugado","erro","error","glitch",
    "lag","lagando","crash","crashou",
    "nao funciona","não funciona","nao vai","não vai",
    "broken","issue","problem","defeito","deu erro"
  ],

  comprar: [
    "pegar","adquirir","comprar","buy","purchase","get","grab","cop",
    "comprarlo","comprar eso","levar","vou levar","vou pegar",
    "fechar","fechar compra","fechar negocio","fechar negócio"
  ],

  barato: [
    "barato","baratinho","em conta","cheap","low price","budget",
    "economico","econômico","custo beneficio","custo-beneficio",
    "cost benefit","custo x beneficio","custo x benefício",
    "mais em conta","acessivel","acessível","basicão","basico"
  ],

  caro: [
    "caro","muito caro","preco alto","preço alto",
    "expensive","overpriced","pricey","salgado"
  ],

  computador: [
    "pc","computador","setup","desktop","rig","gaming rig","machine",
    "build","maquina","máquina","cpu","pczinho","pc gamer","torre"
  ],

  gpu: [
    "placa de video","placa de vídeo","gpu","video card","graphics card",
    "vga","placa grafica","placa gráfica"
  ],

  notebook: [
    "notebook","laptop","pc portatil","pc portátil","ultrabook"
  ],

  jogar: [
    "jogar","play","gaming","rodar jogo","run games","fps game",
    "rodar","rodar liso","joguinho","gamezinho"
  ],

  legal: [
    "top","massa","daora","show","nice","cool","awesome",
    "dope","lit","fire","brabo","insano","animal","monstro"
  ],

  comparar: [
    "comparar","comparacao","comparação","versus","vs","diferença","diferenca",
    "qual melhor","vale mais a pena"
  ],

  estudo: [
    "estudo","faculdade","facul","estudar","aula","curso"
  ],

  programar: [
    "programar","programacao","programação","codigo","código","dev","codar"
  ],

  trabalho: [
    "trabalho","trampar","trampar com","servico","serviço","job"
  ],

  render: [
    "render","renderizar","3d","arquitetura","edicao","edição","design"
  ],

  urgente: [
    "agora","hoje","ja","já","urgente","imediato"
  ]
};

function escapeRegExp(text=""){
  return text.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}

function normalizeSlang(text){

  let t = String(text || "").toLowerCase();

  for(const key in SLANG_MAP){

    const list = [...SLANG_MAP[key]].sort((a,b)=>b.length-a.length);

    for(const slang of list){

      const rg = new RegExp(`\\b${escapeRegExp(slang)}\\b`, "g");

      t = t.replace(rg, key);
    }
  }

  return normalize(t);
}

/* ========================================
SEMANTIC / BUDGET PARSER
======================================== */

function parseBudget(text){

  const t = normalize(text);

  const millionLike = t.match(/(\d+(?:[.,]\d+)?)\s*(mil|k)\b/);
  if(millionLike){
    const raw = millionLike[1].replace(",",".");
    const value = Number(raw);
    if(Number.isFinite(value)){
      return Math.round(value * 1000);
    }
  }

  const conto = t.match(/(\d+(?:[.,]\d+)?)\s*conto\b/);
  if(conto){
    const raw = conto[1].replace(",",".");
    const value = Number(raw);
    if(Number.isFinite(value)){
      return Math.round(value * 1000);
    }
  }

  const dotted = t.match(/\b\d{1,3}(?:\.\d{3})+\b/);
  if(dotted){
    return Number(dotted[0].replace(/\./g,""));
  }

  const commaMoney = t.match(/\b\d{1,3}(?:,\d{3})+\b/);
  if(commaMoney){
    return Number(commaMoney[0].replace(/,/g,""));
  }

  const simple = t.match(/\b\d{3,6}\b/);
  if(simple){
    return Number(simple[0]);
  }

  if(/nao quero gastar muito|não quero gastar muito|algo barato|mais barato|economico|econômico/.test(t)){
    return 3000;
  }

  return null;
}

function detectUse(text){

  const t = normalize(text);

  if(/valorant|cs2|cs|fortnite|warzone|fps|jogar|jogo|gaming|gamer/.test(t)){
    return "gaming";
  }

  if(/estudo|faculdade|estudar|curso|programar|programacao|programação|codigo|código|dev/.test(t)){
    return "study";
  }

  if(/trabalho|render|edicao|edição|design|3d|arquitetura|produtividade|workstation/.test(t)){
    return "work";
  }

  return null;
}

function detectGame(text){

  const t = normalize(text);

  if(/valorant|vava/.test(t)) return "valorant";
  if(/cs2|counter strike|cs\b/.test(t)) return "cs2";
  if(/fortnite/.test(t)) return "fortnite";
  if(/warzone/.test(t)) return "warzone";
  if(/gta ?v|gta5|gta 5/.test(t)) return "gta5";

  return null;
}

function semanticParser(text){

  const normalized = normalize(text);

  const result = {
    budget: parseBudget(normalized),
    use: detectUse(normalized),
    game: detectGame(normalized),
    intent: null
  };

  if(/pc|computador|setup|maquina|máquina/.test(normalized)){
    result.intent = "pc_build";
  }

  if(/placa de video|placa de vídeo|gpu|rtx|rx|gtx|vga/.test(normalized)){
    result.intent = "gpu_search";
  }

  if(/notebook|laptop|ultrabook/.test(normalized)){
    result.intent = "notebook_search";
  }

  if(/monitor|144hz|165hz|240hz/.test(normalized)){
    result.intent = "monitor_search";
  }

  return result;
}
/* ========================================
INTENT ENGINE
======================================== */

const STATIC_INTENTS = [
  {
    intent:"greeting",
    keywords:["oi","ola","olá","salve","opa","hello","hi"],
    userExamples:["oi","oi tudo bem","fala ai"],
    activationSignals:["oi"]
  },
  {
    intent:"pc_help",
    keywords:["pc","computador","pc gamer","montar pc","setup"],
    userExamples:["quero um pc","quero montar um pc","preciso de um pc"],
    activationSignals:["pc","computador","montar"]
  },
  {
    intent:"gpu_help",
    keywords:["gpu","placa de video","rtx","rx","gtx","vga"],
    userExamples:["quero uma gpu","preciso de placa de video"],
    activationSignals:["gpu","rtx","rx","gtx"]
  },
  {
    intent:"notebook_help",
    keywords:["notebook","laptop","ultrabook"],
    userExamples:["quero um notebook","preciso de laptop"],
    activationSignals:["notebook","laptop"]
  },
  {
    intent:"compare_products",
    keywords:["comparar","versus","vs","qual melhor","diferenca"],
    userExamples:["qual melhor","qual vale mais a pena"],
    activationSignals:["comparar","vs","diferenca"]
  },
  {
    intent:"product_search",
    keywords:["comprar","produto","catalogo","catalogo","ver opcoes","ver opções"],
    userExamples:["quero comprar","quero ver produtos"],
    activationSignals:["comprar","produto"]
  },
  {
    intent:"purchase_problem",
    keywords:["erro","problema","nao funciona","não funciona","falhou pagamento"],
    userExamples:["deu erro","nao consegui comprar"],
    activationSignals:["problema","erro"]
  }
];

function scoreKeywords(message,tokens,keywords=[]){

  let score = 0;
  const normalizedMessage = normalize(message);

  for(const kw of keywords){

    const k = normalize(kw);

    if(normalizedMessage.includes(k)){
      score += 10;
    }

    for(const token of tokens){
      if(token === k) score += 6;
      if(k.includes(token) || token.includes(k)) score += 3;
    }
  }

  return score;
}

function scoreExamples(message,examples=[]){

  let score = 0;
  const m = normalize(message);

  for(const ex of examples){
    const e = normalize(ex);
    if(m.includes(e)) score += 15;
  }

  return score;
}

function scoreSignals(tokens,signals=[]){

  let score = 0;

  for(const signal of signals){
    const sig = normalize(signal);

    for(const token of tokens){
      if(sig === token) score += 8;
      if(sig.includes(token) || token.includes(sig)) score += 4;
    }
  }

  return score;
}

function detectIntent(message){

  const intents = STATIC_INTENTS;
  const tokens = tokenize(message);

  let best = null;
  let bestScore = 0;

  for(const intent of intents){

    let score = 0;

    score += scoreKeywords(message,tokens,intent.keywords || []);
    score += scoreExamples(message,intent.userExamples || []);
    score += scoreSignals(tokens,intent.activationSignals || []);

    if(score > bestScore){
      bestScore = score;
      best = intent;
    }
  }

  if(bestScore < 6) return null;

  return best;
}

function predictIntentEarly(text){

  const t = normalize(text);

  if(/pc gamer|montar pc|quero um pc|pc pra jogar|pc bom|computador/.test(t)){
    return { intent:"pc_help" };
  }

  if(/placa de video|gpu|rtx|rx|nvidia|amd|gtx/.test(t)){
    return { intent:"gpu_help" };
  }

  if(/notebook|laptop|ultrabook/.test(t)){
    return { intent:"notebook_help" };
  }

  if(/monitor|144hz|165hz|240hz/.test(t)){
    return { intent:"monitor_help" };
  }

  if(/comparar|vs|versus|qual melhor|diferenca/.test(t)){
    return { intent:"compare_products" };
  }

  if(/comprar|produto|catalogo|catalog/.test(t)){
    return { intent:"product_search" };
  }

  if(/problema|erro|nao consegui comprar|falhou pagamento/.test(t)){
    return { intent:"purchase_problem" };
  }

  return null;
}

function interpretChaos(text){

  const t = normalize(text);

  if(/(pc|computador).*(jogar|game|gaming|gamer)/.test(t)) return "pc_gaming";
  if(/(pc|computador).*(trabalho|render|edicao|design)/.test(t)) return "pc_work";
  if(/(pc|computador).*(estudo|faculdade|programar)/.test(t)) return "pc_study";
  if(/(montar|buildar|fazer).*(pc|computador)/.test(t)) return "pc_build";
  if(/pc gamer|setup gamer/.test(t)) return "pc_gaming";

  return null;
}

/* ========================================
MEMORY SCORE / CONTEXT
======================================== */

function getContext(id){

  if(!CONTEXT.has(id)){
    CONTEXT.set(id,{
      started:false,
      lang:"pt",
      stage:"discovery",
      budget:null,
      use:null,
      game:null,
      intent:null,
      customerType:"explorer",
      buyScore:0,
      salesStrategy:"explore",
      productsShown:false,
      lastQuestionType:null,
      memoryScore:{
        budget:null,
        use:null
      }
    });
  }

  return CONTEXT.get(id);
}

function updateMemoryScore(ctx,text){

  if(!ctx.memoryScore){
    ctx.memoryScore = {
      budget:null,
      use:null
    };
  }

  const parsedBudget = parseBudget(text);
  const parsedUse = detectUse(text);

  if(parsedBudget){
    ctx.memoryScore.budget = {
      value: parsedBudget,
      score: 10
    };
    ctx.budget = parsedBudget;
  }

  if(parsedUse){
    ctx.memoryScore.use = {
      value: parsedUse,
      score: 9
    };
    ctx.use = parsedUse;
  }

  return ctx;
}

function shouldAskBudget(ctx){
  return !(ctx.memoryScore && ctx.memoryScore.budget && ctx.memoryScore.budget.score > 0);
}

function shouldAskUse(ctx){
  return !(ctx.memoryScore && ctx.memoryScore.use && ctx.memoryScore.use.score > 0);
}

function updateConversationState(ctx){

  if(!ctx.budget){
    ctx.stage = "ask_budget";
    return ctx;
  }

  if(!ctx.use){
    ctx.stage = "ask_use";
    return ctx;
  }

  if(ctx.productsShown){
    ctx.stage = "decision";
    return ctx;
  }

  if(ctx.buyScore > 0.85){
    ctx.stage = "closing";
    return ctx;
  }

  ctx.stage = "recommendation";
  return ctx;
}

function updateContextBrain(ctx){

  if(!ctx) return ctx;

  if(ctx.budget && ctx.use){
    ctx.stage = "recommendation";
  }

  if(ctx.productsShown){
    ctx.stage = "decision";
  }

  if(ctx.buyScore > 0.85){
    ctx.stage = "closing";
  }

  return ctx;
}

function buildCommerceContext(ctx){

  return {
    readyForRecommendation: !!(ctx.budget && ctx.use),
    missingBudget: !ctx.budget,
    missingUse: !ctx.use
  };
}

/* ========================================
CUSTOMER PROFILE / INTENT GRAPH
======================================== */

function detectCustomerType(text){

  const t = normalize(text);

  if(/benchmark|fps|latencia|clock|vrm|chipset|spec|especifica|especificacao|especificação/.test(t)){
    return "technical";
  }

  if(/comparar|diferenca|qual melhor|vale mais a pena|versus|vs/.test(t)){
    return "analyst";
  }

  if(/quero comprar|vou comprar|vou pegar|vou levar|fechar compra/.test(t)){
    return "buyer";
  }

  if(/nao sei|me ajuda|to perdido|qual escolher/.test(t)){
    return "lost";
  }

  return "explorer";
}

function mapCustomerIntent(ctx){

  if(ctx.buyScore > 0.8){
    return "hot";
  }

  if(ctx.buyScore > 0.5){
    return "warm";
  }

  if(ctx.customerType === "technical" || ctx.customerType === "analyst"){
    return "builder";
  }

  if(ctx.customerType === "lost" || ctx.customerType === "explorer"){
    return "explorer";
  }

  return "unknown";
}

/* ========================================
SALES BRAIN
======================================== */

function detectBuyIntent(text){

  const t = normalize(text);
  let score = 0;

  if(/quero comprar|vou comprar|vou levar|vou pegar|fechar compra/.test(t)) score += 0.9;
  if(/preco|preço|quanto custa|valor|quanto sai/.test(t)) score += 0.4;
  if(/esse roda|esse aguenta|esse e bom|esse é bom|vale a pena/.test(t)) score += 0.3;
  if(/qual melhor|comparar|diferenca entre|diferença entre/.test(t)) score += 0.3;
  if(/qual voce recomenda|qual você recomenda|qual pegar|qual escolher/.test(t)) score += 0.5;
  if(/agora|hoje|ja|já|imediato/.test(t)) score += 0.2;

  return Math.min(score,1);
}

function salesStrategy(score){

  if(score < 0.25) return "explore";
  if(score < 0.6) return "assist";
  return "convert";
}

function chooseProductStrategy(ctx){

  if(ctx.salesStrategy === "assist") return "recommend";
  if(ctx.salesStrategy === "convert") return "direct_offer";
  return "conversation";
}

function generateSalesAction(strategy,products){

  if(!Array.isArray(products) || !products.length) return null;

  if(strategy === "recommend") return products.slice(0,3);
  if(strategy === "direct_offer") return products.slice(0,2);

  return null;
}

/* ========================================
NEURAL / MARKET / LEARNING
======================================== */

function registerSearch(query){

  const key = normalize(query);
  if(!key) return;

  if(!MARKET.searches[key]) MARKET.searches[key] = 0;
  MARKET.searches[key]++;
}

function registerProductView(productId){

  if(!productId) return;
  if(!MARKET.products[productId]) MARKET.products[productId] = 0;
  MARKET.products[productId]++;
}

function registerPriceRange(price){

  if(!price) return;

  let range = "5000+";

  if(price < 2000) range = "0-2000";
  else if(price < 3500) range = "2000-3500";
  else if(price < 5000) range = "3500-5000";

  if(!MARKET.priceRanges[range]) MARKET.priceRanges[range] = 0;
  MARKET.priceRanges[range]++;
}

function registerConversationIntent(intent){

  if(!intent) return;

  const key = intent.intent || intent;

  if(!NEURAL.conversations[key]) NEURAL.conversations[key] = 0;
  NEURAL.conversations[key]++;
}

function learnFromConversation(intent){

  if(!intent) return;

  LEARNING.push({
    intent: intent.intent || intent,
    timestamp: now()
  });

  registerConversationIntent(intent);
}

function storeConversationSample(user,reply){

  LEARNING.push({
    user: normalize(user),
    reply,
    timestamp: now()
  });

  if(LEARNING.length > 300){
    LEARNING.shift();
  }
}

function getSimilarReply(message){

  const m = tokenize(message);

  let best = null;
  let bestScore = 0;

  for(const item of LEARNING){

    if(!item.user || !item.reply) continue;

    const itemTokens = tokenize(item.user);
    let score = 0;

    for(const token of itemTokens){
      if(m.includes(token)) score++;
    }

    if(score > bestScore && score >= 2){
      bestScore = score;
      best = item.reply;
    }
  }

  return best;
}

function registerSuccessfulSuggestion(){
  NEURAL.successfulSuggestions = (NEURAL.successfulSuggestions || 0) + 1;
}

function rankProductsByNeural(products){

  if(!Array.isArray(products)) return [];

  const cloned = [...products];

  return cloned.sort((a,b)=>{

    const sa =
      (NEURAL.clicks[a.id] || 0) * 2 +
      (NEURAL.purchases[a.id] || 0) * 6 -
      (NEURAL.ignores[a.id] || 0);

    const sb =
      (NEURAL.clicks[b.id] || 0) * 2 +
      (NEURAL.purchases[b.id] || 0) * 6 -
      (NEURAL.ignores[b.id] || 0);

    return sb - sa;
  });
}

function neuralMatchProducts(products,ctx){

  if(!Array.isArray(products)) return [];

  const scored = products.map(product=>{

    let score = 0;
    const name = normalize(product.name || "");

    if(ctx.use === "gaming" && /rtx|radeon|rx|gtx|gpu|geforce|placa/.test(name)) score += 6;
    if(ctx.use === "study" && /notebook|laptop|ultrabook/.test(name)) score += 5;
    if(ctx.use === "work" && /workstation|pro|creator/.test(name)) score += 5;

    if(ctx.budget && product.price){
      const price = safeNumber(product.price);
      const diff = Math.abs(price - ctx.budget);

      if(diff < ctx.budget * 0.15) score += 5;
      else if(diff < ctx.budget * 0.30) score += 3;

      if(price > ctx.budget) score -= 1;
    }

    if(ctx.customerType === "technical" || ctx.customerType === "analyst") score += 2;
    if(ctx.stage === "recommendation") score += 2;

    return {
      product,
      score
    };
  });

  scored.sort((a,b)=>b.score-a.score);

  return scored.map(item=>item.product);
}
/* ========================================
CONVERSATION ENGINES
======================================== */

function detectLanguage(headers={}){

  const lang = String(headers["accept-language"] || "").toLowerCase();

  if(lang.includes("en")) return "en";
  if(lang.includes("es")) return "es";
  if(lang.includes("zh")) return "zh";
  if(lang.includes("ru")) return "ru";

  return "pt";
}

function greetingByLang(lang){

  const greetings = {
    pt: "Oi! 👋 Eu sou a Nayla da Nexus. Posso te ajudar a encontrar algum hardware ou montar um PC.",
    en: "Hi! 👋 I'm Nayla from Nexus. I can help you choose hardware or build a PC.",
    es: "Hola! 👋 Soy Nayla de Nexus. Puedo ayudarte a elegir hardware o armar una PC.",
    zh: "你好 👋 我是 Nexus 的 Nayla。我可以帮你选择电脑硬件或组装电脑。",
    ru: "Привет 👋 Я Найla из Nexus. Я могу помочь выбрать комплектующие для ПК."
  };

  return greetings[lang] || greetings.pt;
}

function detectConversationMode(ctx){

  if(ctx.buyScore > 0.7) return "buyer";
  if(ctx.customerType === "technical" || ctx.customerType === "analyst") return "technical";
  if(!ctx.budget && !ctx.use) return "lost";
  if(ctx.budget && !ctx.use) return "guided";
  if(ctx.budget && ctx.use) return "ready";
  return "normal";
}

function adaptiveSalesResponse(mode){

  if(mode === "lost"){
    return "Sem stress 🙂 Me conta primeiro quanto você pretende investir no PC.";
  }

  if(mode === "guided"){
    return "Boa! Com esse orçamento dá pra montar algo legal. Você pretende jogar ou usar para estudo/trabalho?";
  }

  if(mode === "technical"){
    return "Massa! Quer comparar peças específicas ou montar um setup completo?";
  }

  if(mode === "buyer"){
    return "Show! Vou te mostrar algumas opções boas agora 👇";
  }

  return null;
}

function decideAction(ctx){

  if(ctx.buyScore > 0.75) return "offer_product";
  if(ctx.buyScore > 0.45) return "recommend";
  if(ctx.stage === "discovery" || ctx.stage === "ask_budget" || ctx.stage === "ask_use") return "explore";
  return "conversation";
}

function actionMessage(action){

  if(action === "offer_product"){
    return "Achei uma opção que encaixa muito bem no que você está procurando 👇";
  }

  if(action === "recommend"){
    return "Separei algumas opções que podem fazer sentido para você 👇";
  }

  if(action === "explore"){
    return "Deixa eu entender melhor o que você precisa.";
  }

  return null;
}

function autonomousCommerceDecision(ctx){

  if(ctx.buyScore > 0.8) return "close_sale";
  if(ctx.stage === "recommendation") return "show_products";
  if(!ctx.budget) return "collect_budget";
  if(!ctx.use) return "collect_use";
  return "conversation";
}

function commerceDecision(ctx){

  if(ctx.stage === "recommendation" && ctx.buyScore > 0.6) return "show_products";
  if(ctx.stage === "recommendation") return "suggest_products";
  if(!ctx.budget) return "ask_budget";
  if(!ctx.use) return "ask_use";
  return "conversation";
}

function decideNextStep(ctx){

  if(!ctx.budget) return "ask_budget";
  if(!ctx.use) return "ask_use";
  if(ctx.stage === "recommendation") return "recommend_products";
  if(ctx.stage === "decision") return "assist_decision";
  return "discovery";
}

function predictConversationPath(ctx,intent){

  if(!intent){
    if(ctx.stage === "recommendation") return "recommend_products";
    return "discovery";
  }

  const name = intent.intent || intent;

  if(name === "greeting") return "welcome";
  if(name === "product_search") return "product_search";
  if(name === "pc_help") return "pc_build";
  if(name === "notebook_help") return "notebook_help";
  if(name === "gpu_help") return "gpu_help";
  if(name === "compare_products") return "product_compare";
  if(name === "purchase_problem") return "support";

  return "discovery";
}

function pathResponse(path,ctx){

  if(path === "welcome"){
    return "E aí! 👋 Me conta o que você está procurando hoje.";
  }

  if(path === "product_search"){
    return "Boa! Que tipo de produto você está procurando?";
  }

  if(path === "pc_build"){
    if(!ctx.budget) return "Show. Você tem mais ou menos quanto de orçamento pra montar o PC?";
    if(!ctx.use) return "Legal. Você pretende usar mais para jogos, estudo ou trabalho?";
    return null;
  }

  if(path === "notebook_help"){
    if(!ctx.budget) return "Boa! Você já tem alguma faixa de preço em mente para o notebook?";
    return "Você pretende usar mais para estudo, trabalho ou um pouco de tudo?";
  }

  if(path === "gpu_help"){
    return "Boa! Você quer uma GPU mais focada em jogos competitivos, AAA ou custo-benefício?";
  }

  if(path === "product_compare"){
    return "Boa pergunta. Quais produtos você quer comparar?";
  }

  if(path === "support"){
    return "Sem stress. Me conta o que aconteceu que a gente resolve.";
  }

  if(path === "discovery"){
    if(!ctx.budget) return "Você já tem um orçamento em mente?";
    if(!ctx.use) return "Você pretende usar mais para jogos, estudo ou trabalho?";
  }

  return null;
}

function preventLoop(ctx,questionType){

  if(!ctx || !questionType) return false;

  if(ctx.lastQuestionType === questionType){
    return true;
  }

  ctx.lastQuestionType = questionType;
  return false;
}

/* ========================================
PERSONA / STYLE / EXPLAIN
======================================== */

function selectPersona(message){

  const t = normalize(message);

  if(/fps|valorant|cs2|fortnite|rtx|rx|gamer/.test(t)){
    return {
      id:"gamer_braba",
      label:"Gamer Braba"
    };
  }

  if(/plano|assinatura|premium/.test(t)){
    return {
      id:"assistente_premium",
      label:"Assistente Premium"
    };
  }

  return {
    id:"vendedor_amigo",
    label:"Vendedor Amigo"
  };
}

function applyEmotion(text,ctx){

  if(!text) return text;

  if(ctx.customerType === "lost" || ctx.customerType === "explorer"){
    return "Relaxa 😄 " + text;
  }

  if(ctx.customerType === "technical" || ctx.customerType === "analyst" || ctx.customerType === "buyer"){
    return "Beleza 👍 " + text;
  }

  return text;
}

function humanize(text){

  if(!text) return text;

  const replacements = {
    "qual seu orcamento": "com mais ou menos quanto voce pensa em investir?",
    "qual uso do pc": "o que voce pretende fazer mais nele?",
    "produto": "equipamento"
  };

  let result = normalize(text);

  for(const key in replacements){
    const rg = new RegExp(key,"gi");
    result = result.replace(rg,replacements[key]);
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}

const GAME_KNOWLEDGE = {
  valorant: {
    cpu: "Ryzen 5 5600",
    ram: "16GB",
    gpu: "RTX 4060"
  },
  cs2: {
    cpu: "Ryzen 5 5600",
    ram: "16GB",
    gpu: "RTX 4060"
  },
  fortnite: {
    cpu: "Ryzen 7",
    ram: "16GB",
    gpu: "RTX 4060"
  },
  warzone: {
    cpu: "Ryzen 7",
    ram: "16GB",
    gpu: "RTX 4070"
  },
  gta5: {
    cpu: "Ryzen 5 5600",
    ram: "16GB",
    gpu: "RTX 4060"
  }
};

function getGameHardware(game){
  if(!game) return null;
  return GAME_KNOWLEDGE[game] || null;
}

function chooseRecommendationStrategy(ctx){

  if(ctx.budget <= 3000) return "budget_build";
  if(ctx.budget <= 6000) return "mid_range";
  if(ctx.budget > 6000) return "high_end";
  return "default";
}

function explainProduct(product,ctx){

  if(!product) return null;

  const name = product.name || "Esse produto";

  if(ctx.game){
    const hw = getGameHardware(ctx.game);
    if(hw){
      return `${name} faz bastante sentido para ${ctx.game}, e encaixa bem numa build com ${hw.cpu}, ${hw.ram} e ${hw.gpu}.`;
    }
  }

  if(ctx.use === "gaming"){
    return `${name} roda jogos competitivos com ótima performance e faz bastante sentido para o seu perfil.`;
  }

  if(ctx.use === "work"){
    return `${name} é excelente para produtividade e tarefas mais pesadas.`;
  }

  if(ctx.use === "study"){
    return `${name} atende muito bem estudo, programação e uso diário.`;
  }

  return `${name} é uma boa opção para o seu perfil.`;
}

/* ========================================
CATALOG SEARCH STRATEGY
======================================== */

function fetchCatalogProducts(ctx){

  let products = [];

  if(ctx.use === "gaming"){
    products = unique([
      ...searchCatalog("rtx"),
      ...searchCatalog("radeon"),
      ...searchCatalog("gtx")
    ]);
  }

  if(ctx.use === "study"){
    products = unique([
      ...searchCatalog("notebook"),
      ...searchCatalog("laptop"),
      ...searchCatalog("ultrabook")
    ]);
  }

  if(ctx.use === "work"){
    products = unique([
      ...searchCatalog("workstation"),
      ...searchCatalog("pro"),
      ...searchCatalog("creator")
    ]);
  }

  return products.filter(Boolean);
}

/* ========================================
ROUTER
======================================== */

export async function routeMessage(message,context={}){

  const id = context.conversationId || "guest";
  const headers = context.headers || {};

  let ctx = getContext(id);

  ctx.lang = detectLanguage(headers);

  if(!ctx.started){
    ctx.started = true;

    return {
      reply: greetingByLang(ctx.lang),
      products: [],
      suggestions: []
    };
  }

  const rawMessage = String(message || "");
  const cached = getResponseCache(rawMessage);

  if(cached){
    return {
      reply: cached,
      products: [],
      suggestions: []
    };
  }

  registerSearch(rawMessage);

  const normalized = normalizeSlang(rawMessage);
  const parsed = semanticParser(normalized);
  const chaosIntent = interpretChaos(normalized);

  if(parsed.budget) registerPriceRange(parsed.budget);

  if(parsed.budget) ctx.budget = parsed.budget;
  if(parsed.use) ctx.use = parsed.use;
  if(parsed.game) ctx.game = parsed.game;

  updateMemoryScore(ctx, normalized);

  let intent = detectIntent(normalized);

  if(!intent){
    intent = predictIntentEarly(normalized);
  }

  if(!intent && chaosIntent){
    intent = { intent: chaosIntent };
  }

  ctx.intent = intent;
  learnFromConversation(intent);

  ctx.customerType = detectCustomerType(normalized);
  ctx.intentGraph = mapCustomerIntent(ctx);

  ctx.buyScore = detectBuyIntent(normalized);
  ctx.salesStrategy = salesStrategy(ctx.buyScore);

  updateConversationState(ctx);
  updateContextBrain(ctx);

  const persona = selectPersona(normalized);
  ctx.persona = persona;

  const commerceCtx = buildCommerceContext(ctx);
  const mode = detectConversationMode(ctx);
  const adaptiveReply = adaptiveSalesResponse(mode,ctx);
  const nextStep = decideNextStep(ctx);
  const path = predictConversationPath(ctx,intent);
  const predictedReply = pathResponse(path,ctx);
  const autoAction = decideAction(ctx);
  const autoMessage = actionMessage(autoAction);
  const commerceDecisionResult = commerceDecision(ctx);
  const autonomousDecision = autonomousCommerceDecision(ctx);
  const learnedReply = getSimilarReply(normalized);

  if(commerceCtx.readyForRecommendation || ctx.stage === "recommendation"){

    let products = fetchCatalogProducts(ctx);

    products = rankProductsByNeural(products);
    products = neuralMatchProducts(products,ctx);

    const strategy = chooseRecommendationStrategy(ctx);
    ctx.recommendationStrategy = strategy;

    const actionProducts = generateSalesAction(
      chooseProductStrategy(ctx),
      products
    );

    if(actionProducts && actionProducts.length){

      ctx.productsShown = true;
      updateContextBrain(ctx);

      for(const product of actionProducts){
        if(product?.id){
          registerProductView(product.id);
        }
      }

      registerSuccessfulSuggestion();

      const explanation = explainProduct(actionProducts[0],ctx);

      let reply =
        explanation ||
        autoMessage ||
        "Achei algumas opções que fazem bastante sentido para você 👇";

      reply = applyEmotion(reply,ctx);
      reply = humanize(reply);

      setResponseCache(rawMessage,reply);

      storeConversationSample(normalized,reply);

      return {
        reply,
        products: actionProducts,
        suggestions: []
      };
    }
  }

  if(shouldAskBudget(ctx) || !ctx.budget){

    if(!preventLoop(ctx,"ask_budget")){

      let reply = adaptiveReply || predictedReply || "Você já tem um orçamento em mente?";

      reply = applyEmotion(reply,ctx);
      reply = humanize(reply);

      setResponseCache(rawMessage,reply);
      storeConversationSample(normalized,reply);

      return {
        reply,
        products: [],
        suggestions: []
      };
    }
  }

  if(shouldAskUse(ctx) || !ctx.use){

    if(!preventLoop(ctx,"ask_use")){

      let reply =
        adaptiveReply ||
        predictedReply ||
        "Você pretende usar mais para jogos, estudo ou trabalho?";

      reply = applyEmotion(reply,ctx);
      reply = humanize(reply);

      setResponseCache(rawMessage,reply);
      storeConversationSample(normalized,reply);

      return {
        reply,
        products: [],
        suggestions: []
      };
    }
  }

  if(learnedReply){

    const reply = humanize(applyEmotion(learnedReply,ctx));

    setResponseCache(rawMessage,reply);

    return {
      reply,
      products: [],
      suggestions: []
    };
  }

  if(nextStep === "assist_decision" || ctx.stage === "decision"){

    let reply = "Quer que eu compare algumas opções ou prefere que eu te indique a melhor direto?";

    reply = applyEmotion(reply,ctx);
    reply = humanize(reply);

    setResponseCache(rawMessage,reply);
    storeConversationSample(normalized,reply);

    return {
      reply,
      products: [],
      suggestions: []
    };
  }

  if(autonomousDecision === "close_sale"){

    let reply = "Você já está bem perto de fechar. Se quiser, eu posso te mostrar a opção mais certeira agora 👇";

    reply = applyEmotion(reply,ctx);
    reply = humanize(reply);

    setResponseCache(rawMessage,reply);
    storeConversationSample(normalized,reply);

    return {
      reply,
      products: [],
      suggestions: []
    };
  }

  if(commerceDecisionResult === "conversation" || autoAction === "explore"){

    let reply = autoMessage || predictedReply || "Me conta um pouco melhor o que você está procurando.";

    reply = applyEmotion(reply,ctx);
    reply = humanize(reply);

    setResponseCache(rawMessage,reply);
    storeConversationSample(normalized,reply);

    return {
      reply,
      products: [],
      suggestions: []
    };
  }

  let fallback = "Perfeito. Já entendi bem o que você quer. Deixa eu organizar as melhores opções para você.";

  if(ctx.game){
    const hw = getGameHardware(ctx.game);
    if(hw){
      fallback = `Para ${ctx.game}, uma base boa seria ${hw.cpu}, ${hw.ram} e ${hw.gpu}. Agora deixa eu encaixar isso no seu orçamento.`;
    }
  }

  fallback = applyEmotion(fallback,ctx);
  fallback = humanize(fallback);

  setResponseCache(rawMessage,fallback);
  storeConversationSample(normalized,fallback);

  return {
    reply: fallback,
    products: [],
    suggestions: []
  };
}