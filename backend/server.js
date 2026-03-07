// backend/server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productRoutes from "./routes/product.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import chatRoutes from "./routes/chat.routes.js";

import { pool } from "./db/pool.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   ROTAS API
========================= */

app.use("/api", productRoutes);
app.use("/api/v1", productRoutes);

app.use("/api/v1/payment", paymentRoutes);

app.use("/api/v1/checkout", checkoutRoutes);

app.use("/api/v1/chat", chatRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", async (_req, res) => {
  try {
    if (pool) {
      await pool.query("SELECT 1");
    }

    return res.json({
      ok: true,
      status: "online"
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "DB_ERROR"
    });
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});