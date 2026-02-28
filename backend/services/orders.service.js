// backend/services/orders.service.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { ORDER_STATUS } from "../orders/orders.status.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Armazenamento simples e seguro (não depende de libs, não quebra deploy)
// Persistência em arquivo local do servidor (Render).
const DATA_DIR = path.resolve(__dirname, "../data");
const STORE_FILE = path.join(DATA_DIR, "orders.store.json");

// ===== Helpers de store (arquivo JSON) =====
async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(
      STORE_FILE,
      JSON.stringify({ orders: [] }, null, 2),
      "utf-8"
    );
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    // Se corromper por algum motivo, reinicia sem quebrar deploy
    return { orders: [] };
  }
}

async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowISO() {
  return new Date().toISOString();
}

function genId(prefix = "ord") {
  // ID simples e consistente (sem libs)
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ===== API do Service =====
export { ORDER_STATUS }; // reexport pra qualquer arquivo que quiser importar daqui

export async function createOrder(payload = {}) {
  const store = await readStore();

  const order = {
    id: genId("order"),
    userId: payload.userId || null,

    // itens do carrinho (como veio do checkout)
    items: Array.isArray(payload.items) ? payload.items : [],

    // resumo financeiro
    totals: payload.totals || {
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0
    },

    // dados de frete / destino
    shipping: payload.shipping || {
      address: null,
      method: null,
      etaDays: null
    },

    // pagamento
    payment: payload.payment || {
      provider: null, // ex: "mercadopago"
      status: "PENDING",
      externalId: null, // id do pagamento no gateway
      method: null // pix / card / boleto
    },

    status: ORDER_STATUS.CRIADO,
    history: [
      { at: nowISO(), status: ORDER_STATUS.CRIADO, note: "Order created" }
    ],

    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  store.orders.push(order);
  await writeStore(store);

  return order;
}

export async function findOrderById(orderId) {
  if (!orderId) return null;
  const store = await readStore();
  return store.orders.find((o) => o.id === orderId) || null;
}

export async function listOrdersByUser(userId) {
  const store = await readStore();
  return store.orders.filter((o) => o.userId === userId);
}

export async function listAllOrders({ limit = 200 } = {}) {
  const store = await readStore();
  return store.orders.slice(-limit).reverse();
}

export async function attachPayment(orderId, paymentPatch = {}) {
  const store = await readStore();
  const idx = store.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const current = store.orders[idx];
  current.payment = {
    ...current.payment,
    ...paymentPatch
  };
  current.updatedAt = nowISO();

  store.orders[idx] = current;
  await writeStore(store);

  return current;
}

export async function updateOrderStatus(orderId, newStatus, meta = {}) {
  const store = await readStore();
  const idx = store.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const current = store.orders[idx];

  current.status = newStatus;
  current.updatedAt = nowISO();
  current.history = Array.isArray(current.history) ? current.history : [];
  current.history.push({
    at: nowISO(),
    status: newStatus,
    note: meta.note || null,
    meta: meta.meta || null
  });

  // Se quiser sincronizar status de pagamento também
  if (meta.paymentStatus) {
    current.payment = current.payment || {};
    current.payment.status = meta.paymentStatus;
  }
  if (meta.externalPaymentId) {
    current.payment = current.payment || {};
    current.payment.externalId = meta.externalPaymentId;
  }

  store.orders[idx] = current;
  await writeStore(store);

  return current;
}