// backend/middlewares/compression.middleware.js
import compression from "compression";

export const compressResponse = compression({
  level: 6, // equilíbrio entre CPU e compressão
  threshold: 1024, // só comprime acima de 1kb
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  }
});