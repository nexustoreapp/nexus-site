// backend/server.js

import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

// Libera CORS (pra conseguir chamar do front)
app.use(cors());
app.use(express.json());

// Rota raiz só pra teste
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message:
      "Bem-vindo à API do Nexus. Use /api/health, /api/plans, /api/search/demo e /api/product/demo.",
  });
});

// Rota /test só pra conferir
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Rota /test funcionando ✅",
    hint: "Agora você pode testar também /api/health, /api/plans, /api/search/demo",
  });
});

// Aplica todas as rotas
app.use("/api", routes);

// Porta: local (3000) ou Render (process.env.PORT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend do Nexus rodando na porta ${PORT}`);
});
