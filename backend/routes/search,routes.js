// backend/routes/search.routes.js

import express from "express";
const router = express.Router();

// Rota de busca FAKE temporária
router.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Rota /api/search funcionando (mock)!",
  });
});

export default router;
