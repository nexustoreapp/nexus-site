// backend/routes/monitor.routes.js

import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/status", (req, res) => {
  const logFile = path.resolve("logs/monitor.log");

  res.json({
    ok: true,
    logging: fs.existsSync(logFile)
  });
});

export default router;