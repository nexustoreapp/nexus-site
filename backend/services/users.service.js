// backend/services/users.service.js
import { pool } from "../db/pool.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();

  // whitelist
  const allowed = new Set(["free", "core", "hyper", "omega", "core_test"]);
  if (allowed.has(p)) return p;

  // aliases
  if (p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";

  return "free";
}

export async function updateUserPlanByEmail(email, plan) {
  const e = normalizeEmail(email);
  const p = normalizePlan(plan);

  if (!e) {
    console.log("updateUserPlanByEmail: email vazio");
    return { ok: false, error: "EMAIL_REQUIRED" };
  }

  try {
    const r = await pool.query(
      `UPDATE users
       SET plan = $1, updated_at = NOW()
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, email, plan`,
      [p, e]
    );

    if (!r.rows?.length) {
      console.log("Usuário não encontrado para atualizar plano:", e);
      return { ok: false, error: "USER_NOT_FOUND" };
    }

    return { ok: true, user: r.rows[0] };
  } catch (err) {
    console.error("Erro ao atualizar plano do usuário (Postgres):", err?.message || err);

    // não quebra webhook
    return { ok: false, error: "DB_UPDATE_FAILED" };
  }
}