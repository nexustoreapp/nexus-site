// backend/server.js

import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message:
      "API Nexus online. Use /api/health, /api/plans, /api/search/demo",
  });
});

// Rota /test só pra você conferir
app.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Rota /test funcionando ✅",
    hint: "Agora você pode testar também /api/health, /api/plans, /api/search/demo",
  });
});

// Aqui ele aplica TODAS as rotas do /routes
app.use("/api", routes);

app.listen(3000, () => {
  console.log("🚀 Backend do Nexus rodando na porta 3000");
});