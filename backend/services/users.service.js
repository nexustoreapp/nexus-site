// backend/services/users.service.js
import { pool } from "../db/pool.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCpf(cpf) {
  // mantém só números
  return String(cpf || "").replace(/\D/g, "");
}

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();

  const allowed = new Set(["free", "core", "hyper", "omega", "core_test"]);
  if (allowed.has(p)) return p;

  if (p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";

  return "free";
}

/**
 * Atualiza plano pelo EMAIL (fallback)
 */
export async function updateUserPlanByEmail(email, plan) {
  const e = normalizeEmail(email);
  const p = normalizePlan(plan);

  if (!e) return { ok: false, error: "EMAIL_REQUIRED" };

  try {
    const r = await pool.query(
      `UPDATE users
       SET plan = $1, updated_at = NOW()
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, email, cpf, plan`,
      [p, e]
    );

    if (!r.rows?.length) return { ok: false, error: "USER_NOT_FOUND" };
    return { ok: true, user: r.rows[0] };
  } catch (err) {
    console.error("updateUserPlanByEmail error:", err?.message || err);
    return { ok: false, error: "DB_UPDATE_FAILED" };
  }
}

/**
 * ✅ Atualiza plano pelo CPF (principal)
 * Requer coluna users.cpf
 */
export async function updateUserPlanByCpf(cpf, plan) {
  const c = normalizeCpf(cpf);
  const p = normalizePlan(plan);

  if (!c) return { ok: false, error: "CPF_REQUIRED" };

  try {
    const r = await pool.query(
      `UPDATE users
       SET plan = $1, updated_at = NOW()
       WHERE REGEXP_REPLACE(cpf, '\\D', '', 'g') = $2
       RETURNING id, email, cpf, plan`,
      [p, c]
    );

    if (!r.rows?.length) return { ok: false, error: "USER_NOT_FOUND" };
    return { ok: true, user: r.rows[0] };
  } catch (err) {
    console.error("updateUserPlanByCpf error:", err?.message || err);
    return { ok: false, error: "DB_UPDATE_FAILED" };
  }
}