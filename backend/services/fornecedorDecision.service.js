import fs from "fs";
import path from "path";

const DATA_PATH = path.resolve("backend/data/fornecedores.json");

function loadFornecedores() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw).fornecedores;
}

export function escolherFornecedor({ categoria }) {
  const fornecedores = loadFornecedores()
    .filter(f => f.ativo && f.categorias.includes(categoria));

  if (!fornecedores.length) return null;

  // Score simples (SLA + risco + margem)
  fornecedores.sort((a, b) => {
    const scoreA = a.slaDias + a.risco * 10 - a.margem * 5;
    const scoreB = b.slaDias + b.risco * 10 - b.margem * 5;
    return scoreA - scoreB;
  });

  return fornecedores[0];
}