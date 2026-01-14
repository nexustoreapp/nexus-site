// backend/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "NO_TOKEN"
      });
    }

    const token = auth.replace("Bearer ", "").trim();

    const payload = jwt.verify(token, JWT_SECRET);

    req.user = payload;
    next();

  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "TOKEN_INVALID_OR_EXPIRED"
    });
  }
}