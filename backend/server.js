import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index.js";

const app = express();

/* ===============================
   CORS — LIBERADO PARA O SITE
================================ */
const allowedOrigins = [
  "https://nexustore.store",
  "https://www.nexustore.store",
  "https://nexus-site-oufm.onrender.com",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // não bloquear em produção
      }
    },
  })
);

app.use(express.json());

/* ===============================
   PATHS
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..");

/* ===============================
   FRONTEND
================================ */
app.use(express.static(WEB_ROOT));

/* ===============================
   API
================================ */
app.use("/api", routes);

/* ❌ IMPORTANTE:
   NUNCA deixar a API cair no index.html
*/
app.use("/api/*", (req, res) => {
  res.status(404).json({
    ok: false,
    error: "API_ROUTE_NOT_FOUND",
    path: req.originalUrl,
  });
});

/* ===============================
   SPA FALLBACK
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(WEB_ROOT, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Nexus rodando na porta ${PORT}`)
);
