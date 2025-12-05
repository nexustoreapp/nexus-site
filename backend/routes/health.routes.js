// backend/routes/health.routes.js

import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

const router = Router();

// GET /api/health
router.get("/", healthController.status);

export default router;
