// backend/services/orders.service.js
import crypto from "crypto";
import { ORDER_STATUS } from "../orders/orders.status.js";

/**
 * Store em memória (MVP)
 * Depois a gente troca por PostgreSQL sem quebrar a API do service.
 */
const ORDERS = new Map(); // orderId -> orderObject

function nowISO() {
  return new Date().toISOString();
}

function safeId(prefix = "ord") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Cria pedido (mínimo)
 * Espera payload no formato:
 * {
 *   userEmail,
 *   items: [{ sku, title, price, qty }],
 *   shipping: { price, etaDays, carrier },
 *   totals: { subtotal, shipping, total },
 *   supplier: { provider, ... } (opcional),
 *   metadata: {} (opcional)
 * }
 */
export async function createOrder(payload = {}) {
  const orderId = payload.orderId || safeId("order");

  const userEmail = normalizeEmail(payload.userEmail);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const shipping = payload.shipping || {};
  const totals = payload.totals || {};
  const supplier = payload.supplier || null;
  const metadata = payload.metadata || {};

  const order = {
    id: orderId,
    userEmail,
    items,
    shipping,
    totals,
    supplier,
    metadata,

    status: ORDER_STATUS.CRIADO,
    paymentStatus: "UNPAID",

    createdAt: nowISO(),
    updatedAt: nowISO(),

    // trilha de eventos (auditoria)
    events: [
      {
        at: nowISO(),
        type: "ORDER_CREATED",
        note: "Pedido criado",
        meta: {}
      }
    ]
  };

  ORDERS.set(orderId, order);
  return clone(order);
}

/**
 * Busca por ID
 */
export async function findOrderById(orderId) {
  const order = ORDERS.get(orderId);
  return order ? clone(order) : null;
}

/**
 * Compat: alguns lugares importam getOrderById
 */
export async function getOrderById(orderId) {
  return findOrderById(orderId);
}

/**
 * Lista por email do usuário
 */
export async function listOrdersByUserEmail(userEmail) {
  const email = normalizeEmail(userEmail);
  const out = [];
  for (const order of ORDERS.values()) {
    if (normalizeEmail(order.userEmail) === email) out.push(clone(order));
  }
  // mais recente primeiro
  out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return out;
}

/**
 * Adiciona evento no pedido (audit trail)
 */
export async function addOrderEvent(orderId, event = {}) {
  const order = ORDERS.get(orderId);
  if (!order) return null;

  const e = {
    at: nowISO(),
    type: event.type || "ORDER_EVENT",
    note: event.note || "",
    meta: event.meta || {}
  };

  order.events = Array.isArray(order.events) ? order.events : [];
  order.events.push(e);
  order.updatedAt = nowISO();

  ORDERS.set(orderId, order);
  return clone(e);
}

/**
 * Atualiza status do pedido
 */
export async function updateOrderStatus(orderId, newStatus, extra = {}) {
  const order = ORDERS.get(orderId);
  if (!order) return null;

  const prev = order.status;
  order.status = newStatus;
  order.updatedAt = nowISO();

  // campos extras opcionais
  if (extra.paymentStatus) order.paymentStatus = extra.paymentStatus;
  if (extra.externalPaymentId) order.externalPaymentId = extra.externalPaymentId;
  if (extra.tracking) order.tracking = extra.tracking;

  await addOrderEvent(orderId, {
    type: "STATUS_CHANGED",
    note: extra.note || `Status: ${prev} -> ${newStatus}`,
    meta: { prev, next: newStatus, ...extra }
  });

  ORDERS.set(orderId, order);
  return clone(order);
}

/**
 * Compat extra: se algum lugar ainda usar um nome antigo
 */
export { ORDER_STATUS };