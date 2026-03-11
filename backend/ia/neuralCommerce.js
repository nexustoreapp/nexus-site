// backend/ia/neuralCommerce.js

import fs from "fs";
import path from "path";

/* ===============================
DATA FILE
=============================== */

const DATA_PATH = path.resolve("backend/ia/data/neural.json");

/* ===============================
LOAD DATA
=============================== */

function loadData(){

  try{

    if(!fs.existsSync(DATA_PATH)){
      return {
        clicks:{},
        purchases:{},
        ignores:{},
        conversations:{}
      };
    }

    const raw = fs.readFileSync(DATA_PATH,"utf-8");

    return JSON.parse(raw);

  }catch(err){

    console.error("Neural load error:",err);

    return {
      clicks:{},
      purchases:{},
      ignores:{},
      conversations:{}
    };

  }

}

/* ===============================
SAVE DATA
=============================== */

function saveData(data){

  try{

    fs.mkdirSync(path.dirname(DATA_PATH),{recursive:true});

    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify(data,null,2)
    );

  }catch(err){

    console.error("Neural save error:",err);

  }

}

/* ===============================
STATE
=============================== */

const NEURAL_DATA = loadData();

/* ===============================
REGISTER CLICK
=============================== */

export function registerProductClick(productId){

  if(!productId) return;

  if(!NEURAL_DATA.clicks[productId]){
    NEURAL_DATA.clicks[productId] = 0;
  }

  NEURAL_DATA.clicks[productId]++;

  saveData(NEURAL_DATA);

}

/* ===============================
REGISTER PURCHASE
=============================== */

export function registerPurchase(productId){

  if(!productId) return;

  if(!NEURAL_DATA.purchases[productId]){
    NEURAL_DATA.purchases[productId] = 0;
  }

  NEURAL_DATA.purchases[productId]++;

  saveData(NEURAL_DATA);

}

/* ===============================
REGISTER IGNORE
=============================== */

export function registerIgnore(productId){

  if(!productId) return;

  if(!NEURAL_DATA.ignores[productId]){
    NEURAL_DATA.ignores[productId] = 0;
  }

  NEURAL_DATA.ignores[productId]++;

  saveData(NEURAL_DATA);

}

/* ===============================
REGISTER CONVERSATION
=============================== */

export function registerConversationIntent(intent){

  if(!intent) return;

  if(!NEURAL_DATA.conversations[intent]){
    NEURAL_DATA.conversations[intent] = 0;
  }

  NEURAL_DATA.conversations[intent]++;

  saveData(NEURAL_DATA);

}

/* ===============================
RANK PRODUCTS
=============================== */

export function rankProductsByNeural(products){

  if(!Array.isArray(products)) return [];

  const scored = products.map(p=>{

    const id = p.id;

    const clicks = NEURAL_DATA.clicks[id] || 0;
    const purchases = NEURAL_DATA.purchases[id] || 0;
    const ignores = NEURAL_DATA.ignores[id] || 0;

    const score =
      clicks * 2 +
      purchases * 6 -
      ignores * 1;

    return {
      product:p,
      score
    };

  });

  scored.sort((a,b)=>b.score-a.score);

  return scored.map(s=>s.product);

}