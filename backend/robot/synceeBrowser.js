import { chromium } from "playwright";

// ESTA É A FUNÇÃO QUE OS OUTROS ARQUIVOS ESPERAM
export async function placeSynceeOrder(fakeOrder) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Teste simples: abrir a página inicial do Syncee
  await page.goto("https://app.syncee.com", {
    waitUntil: "domcontentloaded"
  });

  // Simula um "pedido criado"
  const supplierOrderId = "syncee_" + Date.now();

  await browser.close();

  return supplierOrderId;
}
