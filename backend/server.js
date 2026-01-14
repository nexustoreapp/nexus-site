// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";
import { logCriticalAlert } from "./utils/alertLogger.js";
import { metrics } from "./middlewares/metrics.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(metrics);

/* ===============================
   ROTAS
================================ */
app.use("/api", routes);

/* ===============================
   404
================================ */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ===============================
   ERRO GLOBAL
================================ */
app.use((err, req, res, next) => {
  logCriticalAlert("Unhandled server error", {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  res.status(500).json({
    ok: false,
    error: "INTERNAL_SERVER_ERROR"
  });
});

/* ===============================
   PROCESS ALERTS
================================ */
process.on("uncaughtException", (err) => {
  logCriticalAlert("Uncaught Exception", {
    message: err.message,
    stack: err.stack
  });
});

process.on("unhandledRejection", (reason) => {
  logCriticalAlert("Unhandled Promise Rejection", { reason });
});

/* ===============================
   START
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});