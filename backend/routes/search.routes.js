import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// GET /api/search
router.get("/", searchController);

export default router;
