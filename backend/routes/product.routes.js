// backend/routes/product.routes.js
import { Router } from "express";
import { productController } from "../controllers/product.controller.js";

const router = Router();

// Lista todos (opcional, mas útil depois)
router.get("/", productController.listAll);

// Detalhe de um produto específico
router.get("/:id", productController.getById);

export default router;
