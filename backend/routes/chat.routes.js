// backend/routes/chat.routes.js
import { Router } from "express";
import { chatWithYara } from "../controllers/chat.controller.js";

const router = Router();

// GET /api/v1/chat?message=...
router.get("/", chatWithYara);

export default router;