import intents from "../data/intents.json";

export function detectIntent(message){

const text = String(message||"").toLowerCase();

for(const intent of intents){

for(const kw of intent.keywords){

if(text.includes(kw)){

return intent;

}

}

}

return null;

}