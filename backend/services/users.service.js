import { pool } from "../db/pool.js";

export async function updateUserPlan(paymentId, plan) {

  try {

    /* ===============================
       BUSCAR PEDIDO PELO PAYMENT ID
    =============================== */

    const orderResult = await pool.query(
      `SELECT user_id
       FROM orders
       WHERE external_payment_id = $1`,
      [paymentId]
    );

    if (!orderResult.rows.length) {
      console.log("Pedido não encontrado para pagamento:", paymentId);
      return;
    }

    const userId = orderResult.rows[0].user_id;

    /* ===============================
       ATUALIZAR PLANO
    =============================== */

    await pool.query(
      `UPDATE users
       SET plan = $1
       WHERE id = $2`,
      [plan, userId]
    );

    console.log("Plano atualizado:", userId, "->", plan);

  } catch (err) {

    console.error("Erro ao atualizar plano:", err);

  }

}