// backend/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "AUTH_REQUIRED"
      });
    }

    const token = header.replace("Bearer ", "").trim();

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;

    next();
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "INVALID_OR_EXPIRED_TOKEN"
    });
  }
}