import intents from "../data/intents.json";
import { normalizeSlang } from "./slangNormalizer.js";

export function matchIntent(message){

const text = normalizeSlang(message);

for(const intent of intents){

for(const kw of intent.keywords){

if(text.includes(kw)){

return intent;

}

}

}

return null;

}