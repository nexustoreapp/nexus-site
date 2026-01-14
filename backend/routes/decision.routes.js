import { Router } from "express";
import { antiScraping } from "../middlewares/antiScraping.middleware.js";
import { decision } from "../controllers/decision.controller.js";

const router = Router();

router.post("/", antiScraping, decision);

export default router;