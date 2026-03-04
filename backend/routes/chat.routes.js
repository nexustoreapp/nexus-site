// backend/routes/chat.routes.js
import { Router } from "express";
import { chat } from "../controllers/chat.controller.js";

const router = Router();

// endpoint do chat (IA Nexus)
// OBS: esse router normalmente fica montado em /api/v1/chat no server.js
router.post("/", chat);

export default router;