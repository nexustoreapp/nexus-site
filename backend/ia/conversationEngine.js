// backend/ia/conversationEngine.js

/* =========================================
CONVERSATION STATES
========================================= */

const STATES = {

  GREETING: "greeting",
  DISCOVERY: "discovery",
  NEED_IDENTIFICATION: "need_identification",
  RECOMMENDATION: "recommendation",
  DECISION: "decision",
  SUPPORT: "support"

};


/* =========================================
LANGUAGE DETECTION
========================================= */

export function detectLanguage(headers={}){

  const lang = headers["accept-language"];

  if(!lang) return "pt";

  if(lang.includes("en")) return "en";

  if(lang.includes("es")) return "es";

  if(lang.includes("zh")) return "zh";

  if(lang.includes("ru")) return "ru";

  return "pt";

}


/* =========================================
GREETING BY LANGUAGE
========================================= */

export function greetingByLang(lang){

  const greetings = {

    pt: "Oi! 👋 Eu sou a Nayla da Nexus. Posso te ajudar a encontrar algum hardware ou montar um PC.",

    en: "Hi! 👋 I'm Nayla from Nexus. I can help you choose hardware or build a PC.",

    es: "Hola! 👋 Soy Nayla de Nexus. Puedo ayudarte a elegir hardware o armar una PC.",

    zh: "你好 👋 我是 Nexus 的 Nayla。我可以帮你选择电脑硬件或组装电脑。",

    ru: "Привет 👋 Я Найла из Nexus. Я могу помочь выбрать комплектующие для ПК."

  };

  return greetings[lang] || greetings.pt;

}


/* =========================================
CONVERSATION STATE DETECTOR
========================================= */

export function detectConversationState(ctx,intent){

  if(!intent){

    return STATES.DISCOVERY;

  }

  if(intent.intent === "greeting" || intent.intent === "greeting_variations"){

    return STATES.GREETING;

  }

  if(intent.intent === "pc_help" || intent.intent === "setup_help"){

    return STATES.NEED_IDENTIFICATION;

  }

  if(intent.intent === "product_search"){

    return STATES.DISCOVERY;

  }

  if(intent.intent === "purchase_problem"){

    return STATES.SUPPORT;

  }

  return STATES.DISCOVERY;

}


/* =========================================
SMART RESPONSE ENGINE
========================================= */

export function conversationResponse(ctx,intent){

  const state = detectConversationState(ctx,intent);

  if(state === STATES.GREETING){

    return "E aí! 👋 Me conta o que você está procurando hoje.";

  }

  if(state === STATES.NEED_IDENTIFICATION){

    if(!ctx.budget){

      return "Boa! Você tem mais ou menos quanto de orçamento pra montar ou comprar o PC?";

    }

    return "Legal! O que você pretende fazer mais no computador? Jogos, estudo, trabalho ou um pouco de tudo?";

  }

  if(state === STATES.DISCOVERY){

    return "Tranquilo. Me conta um pouco do que você está procurando.";

  }

  if(state === STATES.SUPPORT){

    return "Sem stress. Vamos resolver isso juntos. O que exatamente aconteceu?";

  }

  return null;

}