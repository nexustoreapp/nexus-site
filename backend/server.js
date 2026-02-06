// backend/server.js
import dotenv from "dotenv";
import app from "./app.js";
import { analyzeLogs } from "./services/securityAnalysis.service.js";

dotenv.config();

const PORT = process.env.PORT || 10000;

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});

/* ===============================
   ANÁLISE AUTOMÁTICA DE LOGS
   (PASSO H – MONITORAMENTO)
================================ */
setInterval(() => {
  try {
    analyzeLogs();
  } catch (err) {
    // silencioso por design
  }
}, 1000 * 60 * 5); // a cada 5 minutos