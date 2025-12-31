// backend/routes/product.routes.js
import { Router } from "express";
import { productController } from "../controllers/product.controller.js";

const router = Router();

// Lista todos os produtos
router.get("/", productController.list);

// Busca produto por SKU
router.get("/:sku", productController.getBySku);

export default router;