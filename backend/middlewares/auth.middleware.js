// backend/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "AUTH_REQUIRED"
      });
    }

    const token = auth.replace("Bearer ", "").trim();

    const payload = jwt.verify(token, JWT_SECRET);

    // usuário autenticado disponível nas rotas
    req.user = {
      id: payload.id,
      email: payload.email,
      cpf: payload.cpf,
      plan: payload.plan
    };

    return next();

  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: "INVALID_OR_EXPIRED_TOKEN"
    });
  }
}