// backend/ia/neuralCommerce.js

const NEURAL_DATA = {
  clicks:{},
  purchases:{},
  ignores:{},
  conversations:{}
};

export function registerProductClick(productId){

  if(!productId) return;

  if(!NEURAL_DATA.clicks[productId]){
    NEURAL_DATA.clicks[productId]=0;
  }

  NEURAL_DATA.clicks[productId]++;

}

export function registerPurchase(productId){

  if(!productId) return;

  if(!NEURAL_DATA.purchases[productId]){
    NEURAL_DATA.purchases[productId]=0;
  }

  NEURAL_DATA.purchases[productId]++;

}

export function registerIgnore(productId){

  if(!productId) return;

  if(!NEURAL_DATA.ignores[productId]){
    NEURAL_DATA.ignores[productId]=0;
  }

  NEURAL_DATA.ignores[productId]++;

}

export function registerConversationIntent(intent){

  if(!intent) return;

  if(!NEURAL_DATA.conversations[intent]){
    NEURAL_DATA.conversations[intent]=0;
  }

  NEURAL_DATA.conversations[intent]++;

}

export function rankProductsByNeural(products){

  if(!Array.isArray(products)) return [];

  return products.sort((a,b)=>{

    const scoreA =
      (NEURAL_DATA.clicks[a.id]||0)*2 +
      (NEURAL_DATA.purchases[a.id]||0)*5 -
      (NEURAL_DATA.ignores[a.id]||0);

    const scoreB =
      (NEURAL_DATA.clicks[b.id]||0)*2 +
      (NEURAL_DATA.purchases[b.id]||0)*5 -
      (NEURAL_DATA.ignores[b.id]||0);

    return scoreB-scoreA;

  });

}