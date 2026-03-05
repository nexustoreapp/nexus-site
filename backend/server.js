// backend/server.js
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { runMigrations } from "./db/migrate.js";

const PORT = process.env.PORT || 10000;

async function bootstrap() {
  // Migração controlada por env, pra não rodar “sem querer”
  import "./db/migrate.js"; {
    console.log("🗄️ MIGRATE_ON_START=1 -> rodando migrations...");
    await runMigrations();
    console.log("✅ Migrations OK");
  } else {
    console.log("ℹ️ MIGRATE_ON_START != 1 -> migrations não rodaram");
  }

  app.listen(PORT, () => {
    console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Falha no bootstrap:", err);
  process.exit(1);
});