// backend/services/users.service.js
import { pool } from "../db/pool.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();

  // seus planos
  if (p === "free") return "free";
  if (p === "core") return "core";
  if (p === "hyper") return "hyper";
  if (p === "omega") return "omega";

  // plano de teste
  if (p === "core_test" || p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";

  // fallback
  return p || "free";
}

/**
 * Atualiza plano pelo EMAIL (recomendado pro seu fluxo atual)
 */
export async function updateUserPlanByEmail(email, plan) {
  const e = normalizeEmail(email);
  const p = normalizePlan(plan);

  if (!e) {
    console.log("updateUserPlanByEmail: email vazio");
    return { ok: false };
  }

  try {
    const r = await pool.query(
      `UPDATE users
       SET plan = $1
       WHERE LOWER(email) = $2
       RETURNING id, email, plan`,
      [p, e]
    );

    if (!r.rows.length) {
      console.log("Usuário não encontrado para update de plano:", e);
      return { ok: false, notFound: true };
    }

    console.log("Plano atualizado:", r.rows[0]);
    return { ok: true, user: r.rows[0] };
  } catch (err) {
    console.error("Erro ao atualizar plano do usuário por email:", err);
    return { ok: false, error: "db_error" };
  }
}

/**
 * Compat: se algum arquivo antigo ainda chamar updateUserPlan(orderId, plan)
 * Mantém o nome, mas tenta fazer algo útil.
 * (Hoje o seu webhook novo NÃO precisa disso.)
 */
export async function updateUserPlan(orderId, plan) {
  try {
    // tenta achar email via orders (se existir no seu schema)
    const orderRes = await pool.query(
      `SELECT user_email, user_id FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!orderRes.rows.length) {
      console.log("Pedido não encontrado:", orderId);
      return { ok: false, notFound: true };
    }

    const row = orderRes.rows[0];
    const p = normalizePlan(plan);

    if (row.user_email) {
      return updateUserPlanByEmail(row.user_email, p);
    }

    if (row.user_id) {
      const r = await pool.query(
        `UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, email, plan`,
        [p, row.user_id]
      );
      if (!r.rows.length) return { ok: false, notFound: true };
      return { ok: true, user: r.rows[0] };
    }

    console.log("Order existe mas sem user_email/user_id:", orderId);
    return { ok: false };
  } catch (err) {
    console.error("updateUserPlan(orderId, plan) error:", err);
    return { ok: false, error: "db_error" };
  }
}