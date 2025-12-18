// backend/routes/search.routes.js
import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

router.get("/", searchController.catalog);
router.post("/", searchController.catalog);

export default router;
