-- backend/db/schema.sql

-- Usuários (mínimo - você pode expandir depois)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                           -- uuid/string
  user_email TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  total_cents BIGINT NOT NULL DEFAULT 0,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- snapshot do carrinho
  shipping_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Eventos do pedido (audit trail)
CREATE TABLE IF NOT EXISTS order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);

-- Pagamentos (registro do gateway)
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                        -- "mercadopago"
  provider_payment_id TEXT,                      -- id do MP
  status TEXT NOT NULL DEFAULT 'PENDING',         -- PENDING/PAID/FAILED/REFUNDED
  amount_cents BIGINT NOT NULL DEFAULT 0,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_pid ON payments(provider_payment_id);