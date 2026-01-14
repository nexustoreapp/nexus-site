import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ ok:false, error:"NO_TOKEN" });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({
      ok:false,
      error:"TOKEN_INVALID_OR_EXPIRED"
    });
  }
}