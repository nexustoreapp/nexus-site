// backend/routes/chat.routes.js
import { Router } from "express";
import { chatController } from "../controllers/chat.controller.js";

const router = Router();

// POST /api/chat
router.post("/", chatController.handleMessage);

export default router;
