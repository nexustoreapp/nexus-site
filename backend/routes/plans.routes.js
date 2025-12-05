// backend/routes/plans.routes.js

import { Router } from "express";
import { plansController } from "../controllers/plans.controller.js";

const router = Router();

// GET /api/plans
router.get("/", plansController.list);

// GET /api/plans/:id
router.get("/:id", plansController.getById);

export default router;
