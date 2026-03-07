const SLANG_MAP = {

oi:["eae","salve","opa","yo","sup","fala","fala ai","fala aí"],

tudo_bem:["blz","beleza","suave","de boa","tranquilo"],

amigo:["mano","bro","parça","parceiro"],

problema:["bug","deu ruim","zoado","quebrou","travou"],

comprar:["pegar","adquirir","comprar isso"]

};

export function normalizeSlang(text){

let t = String(text||"").toLowerCase();

for(const key in SLANG_MAP){

for(const slang of SLANG_MAP[key]){

t = t.replace(new RegExp(`\\b${slang}\\b`,"g"),key);

}

}

return t;

}
