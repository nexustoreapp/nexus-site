import { Router } from "express";
import { antiScraping } from "../middlewares/antiScraping.middleware.js";
import { search } from "../controllers/search.controller.js";

const router = Router();

router.get("/", antiScraping, search);

export default router;