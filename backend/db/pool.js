// backend/db/pool.js
import pg from "pg";

const { Pool } = pg;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_NOT_SET");
  }
  return url;
}

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.PGSSL === "false"
    ? false
    : { rejectUnauthorized: false }
});

export async function dbQuery(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}