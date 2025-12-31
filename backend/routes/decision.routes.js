import { Router } from "express";
import { decisionController } from "../controllers/decision.controller.js";

const router = Router();

router.get("/recommend", decisionController.recommend);
router.get("/get", decisionController.get);
router.get("/list", decisionController.list);

export default router;