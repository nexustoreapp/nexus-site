import { Router } from "express";

import {
  robotSubmitOrder,
  robotListOrders,
  robotGetMap,
  robotGetRules
} from "../controllers/robot.controller.js";

import { testSynceeBrowser } from "../robot/synceeTest.js";

const router = Router();

router.post("/submit", robotSubmitOrder);
router.get("/orders", robotListOrders);
router.get("/map", robotGetMap);
router.get("/rules", robotGetRules);

// 🔥 TESTE SYNCEE
router.get("/test-syncee", testSynceeBrowser);

export default router;
