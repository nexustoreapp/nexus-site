import fetch from "node-fetch";
import { chromium } from "playwright-chromium";
import { resolveProduct } from "./resolver.js";

const API = process.env.NEXUS_API; // ex: https://nexus-site-oufm.onrender.com

if (!API) {
  console.error("[WORKER] ERRO: Variável NEXUS_API não definida.");
  process.exit(1);
}

async function getJobs(limit = 3) {
  const r = await fetch(`${API}/api/live/jobs?limit=${limit}`);
  if (!r.ok) throw new Error(`Falha ao pegar jobs: ${r.status}`);
  return r.json();
}

async function sendUpdate(sku, data) {
  const r = await fetch(`${API}/api/live/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, data }),
  });
  if (!r.ok) throw new Error(`Falha ao enviar update: ${r.status}`);
  return r.json();
}

async function run() {
  try {
    const { jobs } = await getJobs(3);

    if (!jobs || jobs.length === 0) {
      console.log("[WORKER] Sem jobs.");
      return;
    }

    console.log(`[WORKER] Peguei ${jobs.length} job(s).`);

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    for (const job of jobs) {
      const page = await browser.newPage();

      try {
        console.log(`[WORKER] Resolvendo SKU=${job.sku} supplier=${job.supplier}`);

        const result = await resolveProduct({
          page,
          sku: job.sku,
          category: job.category,
          title: job.title || job.sku, // se não vier title, usa sku
          supplier: job.supplier,      // "syncee" ou "zendrop"
          supplierProductId: job.supplierProductId || null,
        });

        if (result) {
          await sendUpdate(job.sku, result);
          console.log(`[WORKER] OK -> cache atualizado: ${job.sku}`);
        } else {
          console.log(`[WORKER] Não resolveu (sem match seguro): ${job.sku}`);
        }
      } catch (err) {
        console.error(`[WORKER] ERRO no job ${job.sku}:`, err.message);
      } finally {
        await page.close().catch(() => {});
      }
    }

    await browser.close();
  } catch (err) {
    console.error("[WORKER] ERRO no loop:", err.message);
  }
}

// roda a cada 30s
setInterval(run, 30000);

// roda imediatamente quando inicia
run();