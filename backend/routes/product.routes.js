// backend/routes/product.routes.js
import { Router } from "express";
import products from "../data/products.json" assert { type: "json" };

const router = Router();

router.get("/", (req, res) => {
  res.json({ ok:true, products });
});

router.get("/slug/:slug", (req, res) => {
  const product = products.find(p => p.slug === req.params.slug);
  if (!product) {
    return res.status(404).json({ ok:false });
  }

  res.json({ ok:true, product });
});

export default router;