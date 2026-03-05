import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { verifyRecaptcha } from "../utils/recaptcha.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function cleanCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export async function register(req, res) {
  try {

    const {
      name,
      email,
      password,
      cpf,
      phone,
      recaptchaToken
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok:false,
        error:"email e password são obrigatórios"
      });
    }

    const captchaOk = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!captchaOk) {
      return res.status(400).json({
        ok:false,
        error:"captcha inválido"
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const cpfClean = cleanCpf(cpf);
    const phoneClean = cleanPhone(phone);

    const exists = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [emailNorm]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        ok:false,
        error:"usuário já existe"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = await pool.query(
      `
      INSERT INTO users
      (name,email,password_hash,cpf,phone,plan)
      VALUES ($1,$2,$3,$4,$5,'free')
      RETURNING id,name,email,cpf,plan
      `,
      [
        name || null,
        emailNorm,
        hash,
        cpfClean || null,
        phoneClean || null
      ]
    );

    const user = insert.rows[0];

    const token = signToken({
      sub:user.id,
      email:user.email,
      cpf:user.cpf,
      plan:user.plan
    });

    return res.json({
      ok:true,
      token,
      user
    });

  } catch(err) {

    console.error("REGISTER ERROR:",err);

    return res.status(500).json({
      ok:false,
      error:"erro interno no registro"
    });

  }
}

export async function login(req,res){

  try{

    const {email,password} = req.body || {};

    const emailNorm = String(email).trim().toLowerCase();

    const q = await pool.query(
      "SELECT * FROM users WHERE email=$1 LIMIT 1",
      [emailNorm]
    );

    if(q.rows.length===0){
      return res.status(401).json({ok:false,error:"credenciais inválidas"});
    }

    const user = q.rows[0];

    const okPass = await bcrypt.compare(password,user.password_hash);

    if(!okPass){
      return res.status(401).json({ok:false,error:"credenciais inválidas"});
    }

    const token = signToken({
      sub:user.id,
      email:user.email,
      cpf:user.cpf,
      plan:user.plan
    });

    return res.json({
      ok:true,
      token,
      user:{
        id:user.id,
        name:user.name,
        email:user.email,
        cpf:user.cpf,
        plan:user.plan
      }
    });

  }catch(err){

    console.error(err);

    return res.status(500).json({
      ok:false,
      error:"erro interno no login"
    });

  }
}

export async function me(req,res){

  try{

    const auth = req.headers.authorization;

    if(!auth){
      return res.status(401).json({ok:false});
    }

    const token = auth.split(" ")[1];

    const decoded = jwt.verify(token,JWT_SECRET);

    const q = await pool.query(
      "SELECT id,name,email,cpf,plan FROM users WHERE id=$1",
      [decoded.sub]
    );

    if(q.rows.length===0){
      return res.status(404).json({ok:false});
    }

    return res.json({
      ok:true,
      user:q.rows[0]
    });

  }catch(err){

    return res.status(401).json({
      ok:false
    });

  }
}

export const registerController = register;
export const loginController = login;
export const meController = me;