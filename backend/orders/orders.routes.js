import { Router } from "express";
import { createOrder } from "./orders.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", requireAuth, createOrder);

export default router;