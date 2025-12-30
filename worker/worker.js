import fetch from "node-fetch";
import { chromium } from "playwright-chromium";
import { resolveProduct } from "./resolver.js";

const API = process.env.NEXUS_API;
const ZENDROP_EMAIL = process.env.ZENDROP_EMAIL || null;
const ZENDROP_PASSWORD = process.env.ZENDROP_PASSWORD || null;

if (!API) {
  console.error("[WORKER] ERRO: NEXUS_API não definido");
  process.exit(1);
}

/* ===============================
   LOGIN ZENDROP (SE EXISTIR)
================================ */
async function loginZendrop(page) {
  if (!ZENDROP_EMAIL || !ZENDROP_PASSWORD) {
    console.warn("[WORKER] Zendrop sem credenciais — pulando");
    return false;
  }

  try {
    await page.goto("https://account.zendrop.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', ZENDROP_EMAIL);

    await page.waitForSelector('input[type="password"]', { timeout: 30000 });
    await page.fill('input[type="password"]', ZENDROP_PASSWORD);

    await page.click('button[type="submit"]');

    // Espera QUALQUER coisa do app carregar
    await page.waitForSelector("body", { timeout: 30000 });

    console.log("[WORKER] Zendrop login OK");
    return true;
  } catch (e) {
    console.warn("[WORKER] Falha login Zendrop, seguindo sem ele");
    return false;
  }
}

/* ===============================
   BACKEND
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
  let browser;

  try {
    const { jobs } = await getJobs(3);
    if (!jobs || jobs.length === 0) {
      console.log("[WORKER] Sem jobs");
      return;
    }

    console.log(`[WORKER] Peguei ${jobs.length} job(s)`);

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    // Login Zendrop UMA VEZ
    const loginPage = await browser.newPage();
    const zendropOk = await loginZendrop(loginPage);
    await loginPage.close();

    for (const job of jobs) {
      // Se job é Zendrop mas login falhou → pula
      if (job.supplier === "zendrop" && !zendropOk) {
        console.warn(`[WORKER] Pulando Zendrop SKU=${job.sku}`);
        continue;
      }

      const page = await browser.newPage();

      try {
        console.log(`[WORKER] Resolvendo ${job.sku} (${job.supplier})`);

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
          console.log(`[WORKER] Não resolveu (sem match seguro): ${job.sku}`);
        }
      } catch (e) {
        console.error(`[WORKER] Erro SKU=${job.sku}:`, e.message);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } catch (e) {
    console.error("[WORKER] ERRO no loop:", e.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/* ===============================
   EXECUÇÃO CONTÍNUA
================================ */
run();

setInterval(
  run,
  25000 + Math.floor(Math.random() * 10000)
);