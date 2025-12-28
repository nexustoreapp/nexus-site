export async function placeSynceeOrder(fakeOrder) {
  // 🔴 PROTEÇÃO DE AMBIENTE
  if (process.env.ENABLE_BROWSER_AUTOMATION !== "true") {
    // ambiente não suporta browser
    return "syncee_disabled_env_" + Date.now();
  }

  // IMPORT DINÂMICO (NÃO QUEBRA O START)
  const { chromium } = await import("playwright-chromium");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://app.syncee.com", {
    waitUntil: "domcontentloaded"
  });

  const supplierOrderId = "syncee_" + Date.now();

  await browser.close();
  return supplierOrderId;
}
