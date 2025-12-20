// backend/routes/chat.routes.js
import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";

const router = Router();

// GET /api/chat
router.get("/", chatController);

export default router;
