import { Router } from "express";
import { robotSubmitOrder, robotListOrders, robotGetMap, robotGetRules } from "../controllers/robot.controller.js";

const router = Router();

router.get("/orders", robotListOrders);
router.get("/map", robotGetMap);
router.get("/rules", robotGetRules);

// pedido entra aqui
router.post("/submit", robotSubmitOrder);

export default router;
