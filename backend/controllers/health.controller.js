// backend/controllers/health.controller.js

export const healthController = {
  status: (req, res) => {
    res.json({
      ok: true,
      service: "Nexus API",
      message: "Servidor online ✅",
      timestamp: new Date().toISOString(),
    });
  },
};
