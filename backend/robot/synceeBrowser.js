import { chromium } from "playwright-chromium";

export async function placeSynceeOrder(fakeOrder) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Teste simples (não loga ainda)
  await page.goto("https://app.syncee.com", {
    waitUntil: "domcontentloaded"
  });

  const supplierOrderId = "syncee_" + Date.now();

  await browser.close();
  return supplierOrderId;
}
