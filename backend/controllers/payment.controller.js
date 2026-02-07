import fetch from "node-fetch";

export async function createPayment(req, res) {
  try {
    const user = req.user;
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        ok: false,
        error: "ORDER_OR_AMOUNT_REQUIRED"
      });
    }

    // SIMULAÇÃO PIX (gateway real entra depois)
    const pixPayload = {
      orderId,
      amount,
      status: "PENDING",
      qrCode: `PIX_QR_CODE_${Date.now()}`
    };

    return res.json({
      ok: true,
      payment: pixPayload
    });

  } catch (err) {
    console.error("[PAYMENT CREATE]", err);
    return res.status(500).json({
      ok: false,
      error: "PAYMENT_CREATE_FAILED"
    });
  }
}