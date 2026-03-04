// backend/controllers/deleteAccount.controller.js
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;

  const [type, token] = String(h).split(" ");
  if (type !== "Bearer" || !token) return null;

  return token;
}

export async function deleteAccount(req, res) {

  try {

    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "token ausente"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded?.sub;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "token inválido"
      });
    }

    await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [userId]
    );

    return res.json({
      ok: true,
      message: "Conta deletada"
    });

  } catch (err) {

    console.error("delete account error:", err);

    return res.status(500).json({
      ok: false,
      error: "erro ao deletar conta"
    });

  }

}