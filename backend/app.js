// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";
import { rateLimiter } from "./middlewares/rateLimit.middleware.js";
import { securityHeaders } from "./middlewares/security.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

/* ===============================
   MIDDLEWARES BASE
================================ */
app.use(cors());
app.use(express.json());
app.use(rateLimiter);
app.use(securityHeaders);

/* ===============================
   ROTAS
================================ */
app.use("/api", apiRoutes);

/* ===============================
   404 PADRÃO
================================ */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

/* ===============================
   ERROR HANDLER
================================ */
app.use(errorHandler);

export default app;