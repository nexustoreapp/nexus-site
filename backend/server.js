import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Rota de teste — só para ver que o backend está vivo
app.get("/", (req, res) => {
  res.json({ message: "API Nexus funcionando 🚀" });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("Backend do Nexus rodando na porta 3000");
});
