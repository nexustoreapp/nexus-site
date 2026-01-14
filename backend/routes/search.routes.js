import { Router } from "express";
import { search } from "../controllers/search.controller.js";
import { antiScraping } from "../middlewares/antiScraping.middleware.js";

const router = Router();

router.get("/", antiScraping, search);

export default router;