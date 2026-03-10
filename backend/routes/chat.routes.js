// backend/routes/chat.routes.js

import { Router } from "express";
import { chat } from "../controllers/chat.controller.js";

const router = Router();

// endpoint do chat (IA Nexus)
// normalmente montado em /api/v1/chat no server.js

router.post("/", chat);

export default router;