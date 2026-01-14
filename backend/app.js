// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import apiRoutes from "./routes/index.js";
import { rateLimiter } from "./middlewares/rateLimit.middleware.js";
import { securityLogger } from "./middlewares/securityLog.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(rateLimiter);
app.use(securityLogger);

app.use("/api", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl
  });
});

app.use(errorHandler);

export default app;