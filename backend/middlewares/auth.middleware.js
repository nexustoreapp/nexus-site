import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ ok:false, error:"NO_TOKEN" });
    }

    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ ok:false, error:"INVALID_TOKEN" });
  }
}