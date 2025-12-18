// backend/routes/search.routes.js
import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// GET /api/search?q=...
router.get("/", searchController.search);

export default router;
