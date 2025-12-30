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

// 404 da API
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

// ROOT
app.get("/", (req, res) => {
  res.json({ ok: true, service: "NEXUS API" });
});

// =============================
// AUTO-REFRESH DO LIVE CATALOG
// (SUBSTITUI CRON PAGO)
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_INDEX_PATH = path.join(__dirname, "data", "catalog.index.json");

// URL pública do próprio backend
const PUBLIC_API = "https://nexus-site-oufm.onrender.com";

async function autoRefreshLiveCatalog() {
  try {
    if (!fs.existsSync(CATALOG_INDEX_PATH)) {
      console.warn("[AUTO] catalog.index.json não encontrado");
      return;
    }

    const index = JSON.parse(
      fs.readFileSync(CATALOG_INDEX_PATH, "utf-8")
    );

    const items = Object.entries(index)
      .filter(([, v]) => v?.active)
      .map(([sku, v]) => ({
        sku,
        category: v.category || null,
        title: v.title || sku,
        supplierProductId: v.supplierProductId || null
      }));

    if (!items.length) {
      console.log("[AUTO] Nenhum SKU ativo para enfileirar");
      return;
    }

    console.log(`[AUTO] Enfileirando ${items.length} SKUs (Syncee)`);

    await fetch(`${PUBLIC_API}/api/live/request-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier: "syncee",
        priority: 1,
        items
      })
    });

    console.log(`[AUTO] Enfileirando ${items.length} SKUs (Zendrop)`);

    await fetch(`${PUBLIC_API}/api/live/request-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier: "zendrop",
        priority: 0,
        items
      })
    });

    console.log("[AUTO] Batch enviado com sucesso");
  } catch (err) {
    console.error("[AUTO] Erro no auto-refresh:", err.message);
  }
}

// roda 1x após subir (1 minuto)
setTimeout(autoRefreshLiveCatalog, 60 * 1000);

// depois roda a cada 6 horas
setInterval(autoRefreshLiveCatalog, 6 * 60 * 60 * 1000);

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus rodando na porta ${PORT}`);
});