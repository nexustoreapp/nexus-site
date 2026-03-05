// backend/db/migrate.js
import { pool } from "./pool.js";

export async function runMigrations() {

  console.log("🔧 Rodando migrations...");

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    /* ============================
       USERS
    ============================ */
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        cpf TEXT,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* ============================
       ORDERS
    ============================ */
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        plan TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* ============================
       PAYMENTS
    ============================ */
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        provider TEXT,
        external_id TEXT,
        status TEXT,
        amount NUMERIC,
        currency TEXT,
        user_email TEXT,
        plan TEXT,
        raw JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query("COMMIT");

    console.log("✅ Migrations concluídas");

  } catch (err) {

    await client.query("ROLLBACK");

    console.error("❌ Migration error:", err);

    throw err;

  } finally {

    client.release();

  }

}