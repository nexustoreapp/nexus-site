import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import ordersStore from "../data/orders.store.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const userOrders = ordersStore.filter(o => o.userId === req.user.id);
  res.json({ ok: true, orders: userOrders });
});

export default router;