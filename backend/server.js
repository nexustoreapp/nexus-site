// backend/server.js
import dotenv from "dotenv";
import app from "./app.js";
import { initDb } from "./db/init.js";

dotenv.config();

const PORT = process.env.PORT || 10000;

async function boot() {
  // garante DB pronto
  await initDb();

  app.listen(PORT, () => {
    console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
  });
}

boot().catch((err) => {
  console.error("❌ Falha ao iniciar o servidor:", err);
  process.exit(1);
});