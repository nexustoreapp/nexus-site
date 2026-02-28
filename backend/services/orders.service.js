// backend/services/orders.service.js
import crypto from "crypto";
import { dbQuery } from "../db/pool.js";

function nowIso() {
  return new Date().toISOString();
}

export async function createOrder({
  userId,
  userEmail,
  productId,
  amountCents,
  currency = "BRL",
  status = "CRIADO",
  provider = "manual",
  providerRef = null
}) {
  const id = crypto.randomUUID();

  await dbQuery(
    `
    INSERT INTO orders
      (id, user_id, user_email, product_id, amount_cents, currency, status, provider, provider_ref, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    `,
    [id, userId, userEmail || null, productId, amountCents, currency, status, provider, providerRef]
  );

  await addOrderEvent(id, "ORDER_CREATED", { at: nowIso() });

  return { id };
}

export async function getOrderById(orderId) {
  const { rows } = await dbQuery(`SELECT * FROM orders WHERE id = $1 LIMIT 1`, [orderId]);
  return rows[0] || null;
}

export async function listOrdersByUser(userId) {
  const { rows } = await dbQuery(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateOrderStatus(orderId, nextStatus, extra = {}) {
  const order = await getOrderById(orderId);
  if (!order) {
    return { ok: false, error: "ORDER_NOT_FOUND" };
  }

  await dbQuery(
    `
    UPDATE orders
       SET status = $2,
           tracking_code = COALESCE($3, tracking_code),
           tracking_url  = COALESCE($4, tracking_url),
           shipping_eta_days = COALESCE($5, shipping_eta_days),
           updated_at = NOW()
     WHERE id = $1
    `,
    [
      orderId,
      nextStatus,
      extra.tracking_code || null,
      extra.tracking_url || null,
      typeof extra.shipping_eta_days === "number" ? extra.shipping_eta_days : null
    ]
  );

  await addOrderEvent(orderId, "ORDER_STATUS_UPDATED", {
    from: order.status,
    to: nextStatus,
    extra,
    at: nowIso()
  });

  return { ok: true };
}

export async function addOrderEvent(orderId, type, payload = {}) {
  await dbQuery(
    `INSERT INTO order_events (order_id, type, payload) VALUES ($1,$2,$3)`,
    [orderId, type, JSON.stringify(payload)]
  );
}

export async function setTracking(orderId, { tracking_code, tracking_url }) {
  return updateOrderStatus(orderId, "EM_TRANSITO", { tracking_code, tracking_url });
}