import { Router } from "express";
import { listProducts, getProductBySku } from "../controllers/product.controller.js";

const router = Router();

router.get("/products", listProducts);

router.get("/products/:sku", getProductBySku);

export default router;