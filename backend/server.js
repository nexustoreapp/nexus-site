// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import { securityMonitor } from "./middlewares/security.middleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔒 MONITOR DE SEGURANÇA GLOBAL
app.use(securityMonitor);

// ROTAS
app.use("/api", apiRoutes);

// FALLBACK API
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});