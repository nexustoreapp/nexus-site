// backend/ia/humanStyle.js

export function humanize(text){

  const replacements = {

    "qual seu orçamento":
    "com mais ou menos quanto você pensa em investir?",

    "qual uso do pc":
    "o que você pretende fazer mais nele?",

    "produto":
    "equipamento"

  };

  let result = text;

  for(const key in replacements){

    result = result.replace(key,replacements[key]);

  }

  return result;

}