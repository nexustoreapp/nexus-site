import { Router } from "express";
import { searchProducts } from "../controllers/search.controller.js";
import { searchLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.get("/", searchLimiter, searchProducts);

export default router;