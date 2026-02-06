import { createOrderService } from "./orders.service.js";

export async function createOrder(req, res) {
  try {
    const user = req.user;
    const { product } = req.body;

    const order = await createOrderService({
      user,
      product
    });

    res.json({ ok: true, order });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "ORDER_CREATE_FAILED"
    });
  }
}