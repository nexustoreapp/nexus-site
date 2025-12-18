import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";

const router = Router();

// AQUI TEM QUE SER "/" (e não "/search")
router.get("/", searchController);

export default router;
