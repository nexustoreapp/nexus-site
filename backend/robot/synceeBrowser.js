import { chromium } from "playwright";

export async function placeSynceeOrder(order) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://app.syncee.com/login");

  await page.fill("#email", process.env.SYNCEE_EMAIL);
  await page.fill("#password", process.env.SYNCEE_PASSWORD);
  await page.click("button[type=submit]");

  await page.waitForTimeout(5000);

  await page.goto("https://app.syncee.com/products");

  await page.fill("input[type=search]", order.supplier.supplierSku);
  await page.keyboard.press("Enter");

  await page.waitForTimeout(3000);
  await page.click("button:has-text('Order')");

  await page.waitForTimeout(3000);

  const supplierOrderId = "syncee_" + Date.now();

  await browser.close();

  return supplierOrderId;
}
