// backend/server.js
import http from "http";
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});

/* ===============================
   GRACEFUL SHUTDOWN
================================ */
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM recebido. Encerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor encerrado com segurança.");
    process.exit(0);
  });
});