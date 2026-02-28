// backend/services/orders.service.js
import { pool } from "../db/pool.js";
import { v4 as uuid } from "uuid";

// status base (mantém compat com teu padrão)
export const ORDER_STATUS = {
  CRIADO: "CRIADO",
  AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
  PAGO: "PAGO",
  ENVIADO_PARA_FORNECEDOR: "ENVIADO_PARA_FORNECEDOR",
  ACEITO_PELO_FORNECEDOR: "ACEITO_PELO_FORNECEDOR",
  EM_SEPARACAO: "EM_SEPARACAO",
  EM_TRANSITO: "EM_TRANSITO",
  ENTREGUE: "ENTREGUE",
  CANCELADO: "CANCELADO",
  FALHA_FORNECEDOR: "FALHA_FORNECEDOR"
};

export async function createOrder({ userEmail, userCpf, items = [], amountCents = 0, currency = "BRL" }) {
  const orderId = uuid();

  await pool.query(
    `INSERT INTO orders (id, user_email, user_cpf, status, amount_cents, currency)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [orderId, userEmail || null, userCpf || null, ORDER_STATUS.AGUARDANDO_PAGAMENTO, amountCents, currency]
  );

  // itens
  for (const it of items) {
    const itemId = uuid();
    await pool.query(
      `INSERT INTO order_items (id, order_id, product_id, title, quantity, unit_price_cents)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        itemId,
        orderId,
        it.productId || null,
        it.title || null,
        Number(it.quantity || 1),
        Number(it.unitPriceCents || 0)
      ]
    );
  }

  // evento inicial
  await addOrderEvent(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, "Pedido criado e aguardando pagamento.");

  return { orderId };
}

export async function attachProviderReference(orderId, { provider, providerReference }) {
  await pool.query(
    `UPDATE orders
     SET provider=$2, provider_reference=$3, updated_at=NOW()
     WHERE id=$1`,
    [orderId, provider || null, providerReference || null]
  );
}

export async function getOrderById(orderId) {
  const o = await pool.query(`SELECT * FROM orders WHERE id=$1`, [orderId]);
  if (!o.rows.length) return null;

  const items = await pool.query(
    `SELECT product_id, title, quantity, unit_price_cents
     FROM order_items WHERE order_id=$1 ORDER BY created_at ASC`,
    [orderId]
  );

  const events = await pool.query(
    `SELECT status, note, meta, created_at
     FROM order_events WHERE order_id=$1 ORDER BY created_at ASC`,
    [orderId]
  );

  return { ...o.rows[0], items: items.rows, events: events.rows };
}

export async function listOrdersByUserEmail(userEmail) {
  const r = await pool.query(
    `SELECT id, status, amount_cents, currency, provider, provider_reference, created_at, updated_at
     FROM orders
     WHERE user_email=$1
     ORDER BY created_at DESC
     LIMIT 100`,
    [userEmail]
  );
  return r.rows;
}

export async function addOrderEvent(orderId, status, note = "", meta = null) {
  await pool.query(
    `INSERT INTO order_events (id, order_id, status, note, meta)
     VALUES ($1,$2,$3,$4,$5)`,
    [uuid(), orderId, status, note || null, meta ? JSON.stringify(meta) : null]
  );
}

export async function updateOrderStatus(orderId, status, note = "", meta = null) {
  await pool.query(
    `UPDATE orders SET status=$2, updated_at=NOW() WHERE id=$1`,
    [orderId, status]
  );
  await addOrderEvent(orderId, status, note, meta);
}

export async function findOrderByProviderReference(provider, providerReference) {
  const r = await pool.query(
    `SELECT * FROM orders WHERE provider=$1 AND provider_reference=$2 LIMIT 1`,
    [provider, providerReference]
  );
  return r.rows[0] || null;
}

export async function recordPayment({ orderId, provider, providerPaymentId, status, raw }) {
  await pool.query(
    `INSERT INTO payments (id, order_id, provider, provider_payment_id, status, raw)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [uuid(), orderId, provider, providerPaymentId || null, status, raw ? JSON.stringify(raw) : null]
  );
}