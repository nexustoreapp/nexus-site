// backend/routes/product.routes.js

import { Router } from "express";
import { productController } from "../controllers/product.controller.js";

const router = Router();

// GET /api/product?id=1
router.get("/", productController.real);

export default router;
