import fetch from "node-fetch";
import { chromium } from "playwright-chromium";
import { resolveProduct } from "./resolver.js";

const API = process.env.NEXUS_API;
const ZENDROP_EMAIL = process.env.ZENDROP_EMAIL;
const ZENDROP_PASSWORD = process.env.ZENDROP_PASSWORD;

if (!API) {
  console.error("[WORKER] ERRO: NEXUS_API não definido");
  process.exit(1);
}

if (!ZENDROP_EMAIL || !ZENDROP_PASSWORD) {
  console.error("[WORKER] ERRO: credenciais do Zendrop não definidas");
  process.exit(1);
}

/* ===============================
   LOGIN ZENDROP (1x POR WORKER)
================================ */
async function loginZendrop(page) {
  await page.goto("https://account.zendrop.com/login", {
    waitUntil: "networkidle"
  });

  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.waitForSelector('input[type="password"]', { timeout: 60000 });

  await page.fill('input[type="email"]', ZENDROP_EMAIL);
  await page.fill('input[type="password"]', ZENDROP_PASSWORD);

  await page.click('button[type="submit"]');

  await page.waitForURL("**/app.zendrop.com/**", { timeout: 60000 });

  console.log("[WORKER] Zendrop logado com sucesso");
}

/* ===============================
   BACKEND HELPERS
================================ */
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

/* ===============================
   LOOP PRINCIPAL
================================ */
async function run() {
  try {
    const { jobs } = await getJobs(3);

    if (!jobs || jobs.length === 0) {
      console.log("[WORKER] Sem jobs.");
      return;
    }

    console.log(`[WORKER] Peguei ${jobs.length} job(s).`);

    // 🔥 ABRE BROWSER UMA VEZ
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      // 🔐 LOGIN ZENDROP UMA VEZ
      const loginPage = await browser.newPage();
      await loginZendrop(loginPage);
      await loginPage.close();

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
          await page.close().catch(() => {});
        }
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("[WORKER] ERRO no loop principal:", err.message);
  }
}

/* ===============================
   EXECUÇÃO CONTÍNUA (COM JITTER)
================================ */

// roda imediatamente ao subir
run();

// roda com jitter para não sincronizar workers
setInterval(
  run,
  25000 + Math.floor(Math.random() * 10000)
);