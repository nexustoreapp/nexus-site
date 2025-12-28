import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 ROTAS DA API (TEM QUE VIR ANTES DO 404)
app.use("/api", routes);

// 🔥 404 SÓ DEPOIS DE TODAS AS ROTAS
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

// ROOT
app.get("/", (req, res) => {
  res.json({ ok: true, service: "NEXUS API" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus rodando na porta ${PORT}`);
});
