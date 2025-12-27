import { Router } from "express";
import { dropshipSearchController } from "../controllers/dropship.controller.js";

const router = Router();

// GET /api/dropship/search?q=...
router.get("/search", dropshipSearchController);

export default router;
