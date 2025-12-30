import fetch from "node-fetch";
import { chromium } from "playwright-chromium";
import { resolveProduct } from "./resolver.js";

const API = process.env.NEXUS_API;

if (!API) {
  console.error("[WORKER] ERRO: NEXUS_API não definido");
  process.exit(1);
}

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
async function getJobs(limit = 3) {
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

// ===============================
// LOOP PRINCIPAL
// ===============================
async function run() {
  try {
    const { jobs } = await getJobs(3);

    if (!jobs || jobs.length === 0) {
      console.log("[WORKER] Sem jobs.");
      return;
    }

    console.log(`[WORKER] Peguei ${jobs.length} job(s).`);

    // 🔥 ABRE O BROWSER UMA VEZ
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      // 🔁 PROCESSA JOBS
      for (const job of jobs) {
        const page = await browser.newPage();

        try {
          console.log(
            `[WORKER] Resolvendo SKU=${job.sku} supplier=${job.supplier}`
          );

          const result = await resolveProduct({
            page,
            sku: job.sku,
            category: job.category,
            title: job.title || job.sku,
            supplier: job.supplier,
            supplierProductId: job.supplierProductId || null
          });

          if (result) {
            await sendUpdate(job.sku, result);
            console.log(`[WORKER] OK -> cache atualizado: ${job.sku}`);
          } else {
            console.log(
              `[WORKER] Não resolveu (sem match seguro): ${job.sku}`
            );
          }
        } catch (err) {
          console.error(
            `[WORKER] Erro ao processar SKU=${job.sku}:`,
            err.message
          );
        } finally {
          // 🔒 FECHA APENAS A PÁGINA
          await page.close().catch(() => {});
        }
      }
    } finally {
      // 🔒 FECHA O BROWSER UMA ÚNICA VEZ
      await browser.close();
    }
  } catch (err) {
    console.error("[WORKER] ERRO no loop principal:", err.message);
  }
}

// ===============================
// EXECUÇÃO CONTÍNUA
// ===============================

// roda imediatamente ao subir
run();

// roda a cada 30 segundos
setInterval(run, 30_000);