import fetch from "node-fetch";
import { chromium } from "playwright-chromium";

const API = process.env.NEXUS_API;

async function getOrders() {
  const r = await fetch(`${API}/api/robot/orders`);
  return r.json();
}

async function updateOrder(orderId, status) {
  await fetch(`${API}/api/robot/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, status })
  });
}

async function run() {
  const orders = await getOrders();

  for (const o of orders) {
    if (o.status !== "PENDING") continue;

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://app.syncee.com", {
      waitUntil: "domcontentloaded"
    });

    await browser.close();

    await updateOrder(o.id, "SENT_TO_SUPPLIER");
  }
}

setInterval(run, 30000);
