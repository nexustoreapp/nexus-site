import fs from "fs";
import path from "path";

function findCatalogPath() {
  const candidates = [
    // quando roda a partir da raiz do projeto
    path.join(process.cwd(), "backend", "data", "catalogo.json"),

    // quando roda a partir da pasta backend (Render faz isso em muitos casos)
    path.join(process.cwd(), "data", "catalogo.json"),

    // fallback extra (casos raros)
    path.join(process.cwd(), "..", "backend", "data", "catalogo.json"),
    path.join(process.cwd(), "..", "data", "catalogo.json"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `CATALOGO_NOT_FOUND :: tried: ${candidates.join(" | ")}`
  );
}

function loadCatalog() {
  const catalogPath = findCatalogPath();
  const raw = fs.readFileSync(catalogPath, "utf8");
  return JSON.parse(raw);
}
