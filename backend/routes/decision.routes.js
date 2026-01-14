// backend/routes/decision.routes.js
import { Router } from "express";
import { decision } from "../controllers/decision.controller.js";

const router = Router();

router.post("/", decision);

export default router;