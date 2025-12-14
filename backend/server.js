// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

/**
 * CORS seguro (troque/adicione domínios aqui)
 * - Local: localhost
 * - Produção: nexustore.store
 */
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://nexustore.store",
  "https://www.nexustore.store",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // sem origin = chamadas do próprio servidor, curl, Postman etc
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS bloqueado para: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ✅ Rota raiz só pra teste (texto atualizado, sem /demo)
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message:
      "Bem-vindo à API do Nexus. Use /api/health, /api/plans, /api/search?q=termo e /api/product/:id.",
  });
});

// ✅ Rota /test só pra conferir
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Rota /test funcionando ✅",
    hint: "Teste também: /api/health, /api/plans, /api/search?q=monitor",
  });
});

// ✅ Aplica todas as rotas
app.use("/api", routes);

// ✅ Porta: local (3000) ou Render (process.env.PORT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend do Nexus rodando na porta ${PORT}`);
});