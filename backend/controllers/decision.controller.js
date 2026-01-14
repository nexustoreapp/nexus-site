// backend/controllers/decision.controller.js
export function decision(req, res) {
  try {
    const { input } = req.body || {};

    if (!input) {
      return res.status(400).json({
        ok: false,
        error: "INPUT_REQUIRED"
      });
    }

    /*
      Esse endpoint serve como:
      - decisão futura
      - score
      - regra de negócio
      - fallback se IA cair
      Por enquanto é simples e estável
    */

    return res.json({
      ok: true,
      decision: "allow",
      reason: "default_rule",
      input
    });

  } catch (err) {
    console.error("[DECISION ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "DECISION_FAILED"
    });
  }
}