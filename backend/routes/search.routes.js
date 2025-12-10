// backend/routes/search.routes.js

import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// Rota REAL
router.post("/", searchController.real);
router.get("/", searchController.real);

export default router;
