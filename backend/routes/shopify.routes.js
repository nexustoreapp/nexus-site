import { Router } from "express";
import { shopifyController } from "../controllers/shopify.controller.js";

const router = Router();

router.get("/products", shopifyController.products);
router.get("/product", shopifyController.productByHandle);

export default router;