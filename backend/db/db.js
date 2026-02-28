// backend/db/db.js
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL não definido. DB desativado.");
}

export const pool = connectionString
  ? new Pool({
      connectionString,
      // Render Postgres normalmente exige SSL
      ssl: { rejectUnauthorized: false }
    })
  : null;

export async function dbQuery(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL ausente (pool não inicializado).");
  }
  return pool.query(text, params);
}

export async function dbPing() {
  await dbQuery("SELECT 1 as ok");
  return true;
}