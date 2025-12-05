// backend/server.js

import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Rota raiz só para dizer que a API está ok
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API Nexus online. Use /api/health, /api/plans, /api/search/demo",
  });
});

// Rotas principais da API (tudo começa com /api)
app.use("/api", routes);

// Iniciar servidor
app.listen(3000, () => {
  console.log("🚀 Backend do Nexus rodando na porta 3000");
});
