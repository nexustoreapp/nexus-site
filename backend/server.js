// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";
import { logCriticalAlert } from "./utils/alertLogger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

/* ===============================
   ROTAS
================================ */
app.use("/api", routes);

/* ===============================
   ERRO 404
================================ */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ===============================
   HANDLER DE ERRO GLOBAL
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
   PROCESS LEVEL ALERTS
================================ */
process.on("uncaughtException", (err) => {
  logCriticalAlert("Uncaught Exception", {
    message: err.message,
    stack: err.stack
  });
});

process.on("unhandledRejection", (reason) => {
  logCriticalAlert("Unhandled Promise Rejection", {
    reason
  });
});

/* ===============================
   START
================================ */
app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});