import fetch from "node-fetch";
import { chromium } from "playwright-chromium";
import { resolveProduct } from "./resolver.js";

const API = process.env.NEXUS_API;
const WORKER_SEED = process.env.WORKER_SEED || "default";

if (!API) {
  console.error("[WORKER] ERRO: NEXUS_API não definido");
  process.exit(1);
}

/* ===============================
   BACKEND HELPERS
================================ */
async function getJobs(limit = 5) {
  const r = await fetch(`${API}/api/live/jobs?limit=${limit}`);
  if (!r.ok) throw new Error(`Erro ao buscar jobs: ${r.status}`);
  return r.json();
}

async function sendUpdate(sku, data) {
  const r = await fetch(`${API}/api/live/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, data })
  });
  if (!r.ok) {
    throw new Error(`Erro ao atualizar cache para ${sku}`);
  }
}

/* ===============================
   SEEDS INTELIGENTES POR WORKER
================================ */
function shouldProcessJob(job) {
  const cat = job.category;

  // Worker 1 → produtos únicos (match fácil)
  if (WORKER_SEED === "worker1") {
    return cat === "gpu" || cat === "cpu";
  }

  // Worker 2 → modelos claros
  if (WORKER_SEED === "worker2") {
    return cat === "monitor" || cat === "storage";
  }

  // Worker 3 → marcas fortes
  if (WORKER_SEED === "worker3") {
    return cat === "audio" || cat === "headset";
  }

  // fallback
  return true;
}

/* ===============================
   LOOP PRINCIPAL
================================ */
async function run() {
  let browser;

  try {
    const { jobs } = await getJobs(5);

    if (!jobs || jobs.length === 0) {
      console.log(`[WORKER:${WORKER_SEED}] Sem jobs`);
      return;
    }

    console.log(`[WORKER:${WORKER_SEED}] Peguei ${jobs.length} job(s)`);

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    for (const job of jobs) {

      // 🌱 seed por worker
      if (!shouldProcessJob(job)) {
        console.log(`[WORKER:${WORKER_SEED}] Fora do seed: ${job.sku}`);
        continue;
      }

      const page = await browser.newPage();

      try {
        console.log(
          `[WORKER:${WORKER_SEED}] Resolvendo ${job.sku} (${job.category})`
        );

        const result = await resolveProduct({
          page,
          sku: job.sku,
          category: job.category,
          title: job.title || job.sku,
          supplier: "syncee",
          supplierProductId: job.supplierProductId || null
        });

        if (result) {
          await sendUpdate(job.sku, result);
          console.log(
            `[WORKER:${WORKER_SEED}] OK -> cache atualizado: ${job.sku}`
          );
        } else {
          console.log(
            `[WORKER:${WORKER_SEED}] Sem match seguro: ${job.sku}`
          );
        }
      } catch (err) {
        console.error(
          `[WORKER:${WORKER_SEED}] Erro SKU=${job.sku}:`,
          err.message
        );
      } finally {
        await page.close().catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[WORKER:${WORKER_SEED}] ERRO no loop:`, err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/* ===============================
   EXECUÇÃO CONTÍNUA (COM JITTER)
================================ */

// roda ao subir
run();

// roda a cada 25–35s
setInterval(
  run,
  25000 + Math.floor(Math.random() * 10000)
);