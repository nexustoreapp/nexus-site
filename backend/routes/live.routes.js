import { Router } from "express";
import { liveCatalogController } from "../controllers/liveCatalog.controller.js";

const router = Router();

router.post("/request-batch", liveCatalogController.requestBatch);
router.post("/request", liveCatalogController.request);
router.get("/jobs", liveCatalogController.jobs);
router.post("/update", liveCatalogController.update);
router.get("/get", liveCatalogController.get);

export default router;