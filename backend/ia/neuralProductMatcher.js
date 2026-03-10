// backend/ia/neuralProductMatcher.js

export function neuralMatchProducts(products,ctx){

  if(!Array.isArray(products)) return [];

  let scoreMap = products.map(p=>{

    let score = 0;

    if(ctx.use === "gaming" && /gpu|rtx|radeon/i.test(p.name)){
      score += 5;
    }

    if(ctx.use === "study" && /notebook|laptop/i.test(p.name)){
      score += 4;
    }

    if(ctx.budget){
      const diff = Math.abs((p.price||0) - ctx.budget);
      score += Math.max(0, 5 - diff/1000);
    }

    if(ctx.customerType === "technical"){
      score += 2;
    }

    return {
      product:p,
      score
    };

  });

  scoreMap.sort((a,b)=>b.score-a.score);

  return scoreMap.map(s=>s.product);

}