import express from "express";
import { getUserFromToken } from "../utils/auth.js";
import { getUserById } from "../services/users.service.js";

const router = express.Router();

router.get("/me", async (req, res) => {

  try {

    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok:false });
    }

    const user = await getUserFromToken(token);

    const dbUser = await getUserById(user.id);

    res.json({
      ok:true,
      plan: dbUser.plan || "free"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({ ok:false });

  }

});

export default router;