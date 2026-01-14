import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import apiRoutes from "./routes/index.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// MIDDLEWARES
// =============================
app.use(cors());
app.use(express.json());

// RATE LIMIT GLOBAL
app.use("/api", apiLimiter);

// =============================
// STATIC
// =============================
app.use(express.static(path.join(__dirname, "../public")));

// =============================
// API
// =============================
app.use("/api", apiRoutes);

// =============================
// FALLBACK
// =============================
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});