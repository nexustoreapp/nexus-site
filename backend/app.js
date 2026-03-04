// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";
import { observability } from "./middlewares/observability.middleware.js";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARES BÁSICOS
================================ */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"]
  })
);

// Mercado Pago manda JSON normalmente, então express.json resolve.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   OBSERVABILIDADE
================================ */
app.use(observability);

/* ===============================
   API (compat /api e /api/v1)
================================ */
app.use("/api", apiRoutes);
app.use("/api/v1", apiRoutes);

/* ===============================
   404 API
================================ */
app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

export default app;