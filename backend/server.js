import "./db/migrate.js";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// rotas da API
app.use("/api", routes);

// rota básica
app.get("/", (req, res) => {
  res.json({ ok: true, service: "Nexus backend" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});