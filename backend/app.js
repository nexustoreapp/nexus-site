// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARES BÁSICOS
================================ */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   API (BACKEND PURO)
   TODA API FICA AQUI
================================ */
app.use("/api", apiRoutes);

/* ===============================
   BLOQUEIO TOTAL DE ROTAS NÃO-API
   (protege scraping / confusão)
================================ */
app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ===============================
   EXPORT
================================ */
export default app;