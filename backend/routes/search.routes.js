import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// /api/search
router.get("/", searchController.real);
router.post("/", searchController.real);

export default router;
