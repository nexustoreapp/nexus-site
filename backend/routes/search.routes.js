// backend/routes/search.routes.js

import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// POST /api/search/demo  → usado pelo front
router.post("/demo", searchController.demo);

// GET /api/search/demo   → testar direto no navegador
router.get("/demo", searchController.demo);

export default router;
