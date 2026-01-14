import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import apiRoutes from "./routes/index.js";
import { securityHeaders } from "./middlewares/securityHeaders.middleware.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// MIDDLEWARES GLOBAIS
// =============================
app.use(cors());
app.use(express.json());
app.use(securityHeaders);

// =============================
// FRONTEND ESTÁTICO
// =============================
app.use(express.static(path.join(__dirname, "../")));

// =============================
// API
// =============================
app.use("/api", apiRoutes);

// =============================
// FALLBACK API
// =============================
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND"
  });
});

// =============================
// ROOT
// =============================
app.get("/", (req, res) => {
  res.json({ ok: true, service: "NEXUS API" });
});

// =============================
// START
// =============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});