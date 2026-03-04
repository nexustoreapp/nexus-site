import { pool } from "../db/pool.js";

export async function updateUserPlan(orderId, plan) {

  try {

    const orderResult = await pool.query(
      `SELECT user_id FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!orderResult.rows.length) {
      console.log("Pedido não encontrado:", orderId);
      return;
    }

    const userId = orderResult.rows[0].user_id;

    await pool.query(
      `UPDATE users
       SET plan = $1
       WHERE id = $2`,
      [plan, userId]
    );

    console.log("Plano atualizado para usuário:", userId, "->", plan);

  } catch (err) {

    console.error("Erro ao atualizar plano do usuário:", err);

  }

}