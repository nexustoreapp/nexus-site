// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { compressResponse } from "./middlewares/compression.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// MIDDLEWARES GLOBAIS
// ===============================
app.use(cors());
app.use(express.json());

// 🔥 COMPRESSÃO GLOBAL
app.use(compressResponse);

// ===============================
// ROTAS API
// ===============================
app.use("/api", routes);

// ===============================
// FALLBACK
// ===============================
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

// ===============================
// START
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});