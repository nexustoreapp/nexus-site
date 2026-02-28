// backend/db/init.js
import { pool } from "./pool.js";

export async function initDb() {
  // Tabelas mínimas para: pedidos, itens, eventos, pagamentos
  const sql = `
  CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_email TEXT,
    user_cpf TEXT,
    status TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    amount_cents INTEGER NOT NULL DEFAULT 0,
    provider TEXT,
    provider_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT,
    title TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS order_events (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at);

  CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_payment_id TEXT,
    status TEXT NOT NULL,
    raw JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
  `;

  await pool.query(sql);
}