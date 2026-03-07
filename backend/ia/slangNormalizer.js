const SLANG_MAP = {

  oi:["eae","salve","opa","yo","sup","fala","fala ai","fala aí"],

  amigo:["mano","bro","parça","parceiro"],

  obrigado:["valeu","tmj","brigado"],

  problema:["bug","deu ruim","zoado","travou"]

};

export function normalizeSlang(text){

  let t = String(text||"").toLowerCase();

  for(const key in SLANG_MAP){

    for(const slang of SLANG_MAP[key]){

      const rg = new RegExp(`\\b${slang}\\b`,"g");

      t = t.replace(rg,key);

    }

  }

  return t;

}