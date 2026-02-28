// backend/routes/orders.routes.js
import { Router } from "express";
import {
  createOrderController,
  getOrderController,
  listMyOrdersController
} from "../controllers/orders.controller.js";

const router = Router();

// /api/v1/orders
router.get("/me", listMyOrdersController);
router.post("/create", createOrderController);
router.get("/:id", getOrderController);

export default router;