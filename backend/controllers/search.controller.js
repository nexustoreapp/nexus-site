// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.join(__dirname, "../data/catalogo");

export function search(req, res) {
  try {
    const q = (req.query.q || "").toLowerCase();
    const files = fs.readdirSync(CATALOG_PATH);

    let results = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const items = JSON.parse(
        fs.readFileSync(path.join(CATALOG_PATH, file), "utf-8")
      );

      const filtered = items.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q)
      );

      results = results.concat(filtered);
    }

    res.json({
      ok: true,
      total: results.length,
      results
    });

  } catch (err) {
    console.error("[SEARCH ERROR]", err);
    res.status(500).json({ ok:false, error:"SEARCH_FAILED" });
  }
}