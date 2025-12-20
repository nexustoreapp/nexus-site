// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

// ---- SERVIR O FRONTEND (arquivos do site) ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Isso aponta pro "root" do repositório (onde fica seu index.html)
const WEB_ROOT = path.resolve(__dirname, "..");

// Serve arquivos estáticos: index.html, chat.html, css, js, imagens...
app.use(express.static(WEB_ROOT));

// API continua em /api
app.use("/api", routes);

app.get("/", (req, res) => {
  res.sendFile(path.join(WEB_ROOT, "index.html"));
});

// (Opcional) Se tentar abrir uma rota que não existe como arquivo, cai pro index
app.get("*", (req, res) => {
  res.sendFile(path.join(WEB_ROOT, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Nexus rodando na porta ${PORT}`));
