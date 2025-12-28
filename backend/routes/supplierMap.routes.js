import { Router } from "express";
import { mapLookupBySku, mapLookupByProvider, mapUpsert } from "../controllers/supplierMap.controller.js";

const router = Router();

// Nexus -> fornecedor (busca o vínculo)
router.get("/sku/:sku", mapLookupBySku);

// fornecedor -> Nexus (acha sku pelo id do fornecedor)
router.get("/:provider/:providerId", mapLookupByProvider);

// cria/atualiza vínculo (Fornecedor -> Nexus)
router.post("/upsert", mapUpsert);

export default router;
