import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

import routes from "./routes/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// =============================
// ROTAS DA API
// =============================
app.use("/api", routes);

app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

app.get("/", (req, res) => {
  res.json({ ok: true, service: "NEXUS API" });
});

// =============================
// AUTO-REFRESH COM PRIORIDADE
// (SOMENTE SYNCEE)
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_INDEX_PATH = path.join(__dirname, "data", "catalog.index.json");
const PUBLIC_API = "https://nexus-site-oufm.onrender.com";

async function autoRefreshLiveCatalog() {
  try {
    const index = JSON.parse(fs.readFileSync(CATALOG_INDEX_PATH, "utf-8"));
    const entries = Object.entries(index).filter(([, v]) => v?.active);

    function makeItems(filterFn) {
      return entries
        .filter(([_, v]) => filterFn(v))
        .map(([sku, v]) => ({
          sku,
          category: v.category || null,
          title: v.title || sku,
          supplierProductId: v.supplierProductId || null
        }));
    }

    const groups = [
      { name: "gpu",     prio: 100, items: makeItems(v => v.category === "gpu") },
      { name: "cpu",     prio:  90, items: makeItems(v => v.category === "cpu") },
      { name: "monitor", prio:  80, items: makeItems(v => v.category === "monitor") },
      { name: "audio",   prio:  70, items: makeItems(v => v.category === "audio") },
      { name: "rest",    prio:  10, items: makeItems(v => !["gpu","cpu","monitor","audio"].includes(v.category)) },
    ];

    for (const g of groups) {
      if (!g.items.length) continue;

      console.log(`[AUTO] Batch ${g.name}: ${g.items.length} SKUs`);

      await fetch(`${PUBLIC_API}/api/live/request-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: "syncee",
          priority: g.prio,
          items: g.items
        })
      });
    }

    console.log("[AUTO] Auto-refresh finalizado (Syncee)");
  } catch (err) {
    console.error("[AUTO] Erro:", err.message);
  }
}

// roda 1 min após subir
setTimeout(autoRefreshLiveCatalog, 60 * 1000);

// depois a cada 6 horas
setInterval(autoRefreshLiveCatalog, 6 * 60 * 60 * 1000);

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus rodando na porta ${PORT}`);
});