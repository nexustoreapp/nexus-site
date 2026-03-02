import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/*
================================
ROTAS PRINCIPAIS DA API
================================
*/

app.use("/api/auth", authRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/tracking", trackingRoutes);

/*
================================
ROTA DE TESTE
================================
*/

app.get("/", (req, res) => {
  res.json({
    status: "NEXUS API ONLINE"
  });
});

/*
================================
PORTA
================================
*/

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus backend rodando na porta ${PORT}`);
});