// backend/db/migrate.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dbQuery, dbPing } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  await dbPing();

  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  // executa tudo em uma tacada só (idempotente)
  await dbQuery(sql);

  return true;
}