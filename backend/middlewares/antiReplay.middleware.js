// backend/middlewares/antiReplay.middleware.js

const usedNonces = new Map();

/*
  Proteção simples:
  - nonce único por tentativa
  - expira automaticamente
*/
export function antiReplay(req, res, next) {
  const nonce = req.headers["x-nexus-nonce"];

  if (!nonce) {
    return res.status(400).json({
      ok: false,
      error: "NONCE_REQUIRED"
    });
  }

  if (usedNonces.has(nonce)) {
    return res.status(409).json({
      ok: false,
      error: "REPLAY_BLOCKED"
    });
  }

  // marca como usado
  usedNonces.set(nonce, Date.now());

  // limpa após 5 minutos
  setTimeout(() => {
    usedNonces.delete(nonce);
  }, 5 * 60 * 1000);

  next();
}