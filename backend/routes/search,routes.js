// backend/routes/search.routes.js

import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// POST /api/search/demo
router.post("/demo", searchController.demoSearch);

export default router;
