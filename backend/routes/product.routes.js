import { Router } from "express";
import { antiScraping } from "../middlewares/antiScraping.middleware.js";
import { listProducts, getProduct } from "../controllers/product.controller.js";

const router = Router();

// catálogo / busca
router.get("/", antiScraping, listProducts);

// produto individual
router.get("/:id", antiScraping, getProduct);

export default router;