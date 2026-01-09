// backend/middleware/auth.middleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ ok:false, error:"NO_TOKEN" });
  }

  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ ok:false, error:"INVALID_TOKEN" });
  }
}

export function requirePlan(minPlan) {
  const order = ["free", "core", "hyper", "omega"];
  return (req, res, next) => {
    const userPlan = req.user?.plan || "free";
    if (order.indexOf(userPlan) < order.indexOf(minPlan)) {
      return res.status(403).json({ ok:false, error:"PLAN_REQUIRED" });
    }
    next();
  };
}