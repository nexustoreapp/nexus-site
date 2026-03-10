// backend/ia/marketIntelligence.js

const MARKET = {
  searches:{},
  products:{},
  priceRanges:{}
};

export function registerSearch(query){

  const key = query.toLowerCase();

  if(!MARKET.searches[key]){
    MARKET.searches[key]=0;
  }

  MARKET.searches[key]++;

}

export function registerProductView(productId){

  if(!productId) return;

  if(!MARKET.products[productId]){
    MARKET.products[productId]=0;
  }

  MARKET.products[productId]++;

}

export function registerPriceRange(price){

  if(!price) return;

  let range="";

  if(price < 2000){
    range="0-2000";
  }else if(price < 3500){
    range="2000-3500";
  }else if(price < 5000){
    range="3500-5000";
  }else{
    range="5000+";
  }

  if(!MARKET.priceRanges[range]){
    MARKET.priceRanges[range]=0;
  }

  MARKET.priceRanges[range]++;

}

export function getMarketInsights(){

  return {
    topSearches:
      Object.entries(MARKET.searches)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5),

    topProducts:
      Object.entries(MARKET.products)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5),

    popularPriceRanges:
      Object.entries(MARKET.priceRanges)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
  };

}