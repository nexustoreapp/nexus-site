import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const r = Router();

r.post("/register", AuthController.register);
r.post("/verify", AuthController.verifyOTP);
r.post("/login", AuthController.login);

export default r;