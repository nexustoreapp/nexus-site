import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();

// =============================
// MIDDLEWARES
// =============================
app.use(cors());
app.use(express.json());

// =============================
// ROTAS DA API
// =============================
app.use("/api", apiRoutes);

// =============================
// FALLBACK PADRONIZADO DA API
// =============================
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

// =============================
// ROOT (health simples)
 // =============================
app.get("/", (req, res) => {
  res.json({ ok: true, service: "NEXUS API" });
});

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});