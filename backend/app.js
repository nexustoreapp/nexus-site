// backend/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import routes from "./routes/index.js";
import { rateLimiter } from "./middlewares/rateLimit.middleware.js";
import { securityHeaders } from "./middlewares/security.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

/* ===============================
   CONFIG BÁSICA
================================ */
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   CORS
================================ */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ===============================
   SEGURANÇA HTTP
================================ */
app.use(helmet());
app.use(securityHeaders);

/* ===============================
   RATE LIMIT GLOBAL
================================ */
app.use(rateLimiter);

/* ===============================
   LOG DE REQUISIÇÕES
================================ */
app.use(
  morgan("combined", {
    skip: (req) => req.path === "/api/health"
  })
);

/* ===============================
   ROTAS
================================ */
app.use("/api", routes);

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
   ERROR HANDLER CENTRAL
================================ */
app.use(errorHandler);

export default app;