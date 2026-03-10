// backend/ia/customerIntentGraph.js

export function mapCustomerIntent(ctx){

  if(ctx.buyScore > 8){
    return "hot";
  }

  if(ctx.buyScore > 5){
    return "warm";
  }

  if(ctx.customerType === "curious"){
    return "explorer";
  }

  if(ctx.customerType === "technical"){
    return "builder";
  }

  return "unknown";

}