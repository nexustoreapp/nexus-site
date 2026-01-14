// backend/middlewares/httpCache.middleware.js
import crypto from "crypto";

export function httpCache(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const payload = JSON.stringify(body);
    const etag = crypto.createHash("md5").update(payload).digest("hex");

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60");

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    return originalJson(body);
  };

  next();
}