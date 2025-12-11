// backend/routes/search.routes.js
import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// GET /api/search?q=...
router.get("/", searchController.catalog);

// Se quiser permitir POST também (ex: busca enviada em JSON)
router.post("/", searchController.catalog);

export default router;
