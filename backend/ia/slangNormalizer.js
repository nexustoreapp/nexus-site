/* =====================================
SLANG MAP GLOBAL
===================================== */

const SLANG_MAP = {

  /* =============================
  SAUDAÇÕES
  ============================= */

  oi: [
    "eae","e ai","eai","fala","fala ai","fala aí","salve","opa","yo",
    "sup","hey","hiya","hello","hi","hola","ola","alo",
    "yo bro","yo man","yo dude",
    "oii","oiii","oiie","oiê",
    "やあ","こんにちは","привет","مرحبا"
  ],

  /* =============================
  AMIGO / CLIENTE
  ============================= */

  amigo: [
    "mano","bro","brother","parça","parceiro","irmão","irmao",
    "dude","mate","my guy","bruh","man",
    "amigo","amiga","compa","compadre",
    "товарищ","друг"
  ],

  /* =============================
  AGRADECIMENTO
  ============================= */

  obrigado: [
    "valeu","vlw","tmj","brigado","brigada",
    "thanks","thx","ty","tysm","thank you",
    "gracias","arigato","ありがとう",
    "спасибо","شكرا"
  ],

  /* =============================
  PROBLEMAS
  ============================= */

  problema: [
    "bug","deu ruim","zoado","travou","quebrou","parou",
    "bugado","erro","error","glitch",
    "lag","lagando","crash","crashou",
    "não funciona","nao funciona",
    "broken","issue","problem"
  ],

  /* =============================
  COMPRAR
  ============================= */

  comprar: [
    "pegar","adquirir","comprar","buy",
    "purchase","get","grab","cop",
    "comprarlo","comprar eso"
  ],

  /* =============================
  BARATO
  ============================= */

  barato: [
    "barato","baratinho","em conta",
    "cheap","low price","budget",
    "econômico","custo beneficio",
    "cost benefit"
  ],

  /* =============================
  CARO
  ============================= */

  caro: [
    "caro","muito caro","preço alto",
    "expensive","overpriced",
    "pricey"
  ],

  /* =============================
  PC / COMPUTADOR
  ============================= */

  computador: [
    "pc","computador","setup",
    "desktop","rig","gaming rig",
    "machine","build"
  ],

  /* =============================
  GPU
  ============================= */

  gpu: [
    "placa de video","placa de vídeo","gpu",
    "video card","graphics card",
    "vga"
  ],

  /* =============================
  NOTEBOOK
  ============================= */

  notebook: [
    "notebook","laptop","pc portatil",
    "pc portátil","ultrabook"
  ],

  /* =============================
  JOGOS
  ============================= */

  jogar: [
    "jogar","play","gaming",
    "rodar jogo","run games",
    "fps game"
  ],

  /* =============================
  INTERNET / GÍRIA GLOBAL
  ============================= */

  legal: [
    "top","massa","daora","show",
    "nice","cool","awesome",
    "dope","lit","fire"
  ]

};


/* =====================================
NORMALIZADOR
===================================== */

export function normalizeSlang(text){

  let t = String(text || "").toLowerCase();

  for(const key in SLANG_MAP){

    for(const slang of SLANG_MAP[key]){

      const rg = new RegExp(`\\b${slang}\\b`, "g");

      t = t.replace(rg, key);

    }

  }

  return t;

}