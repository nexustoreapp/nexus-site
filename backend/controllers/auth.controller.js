import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

const JWT_SECRET = process.env.JWT_SECRET;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

function isStrongPassword(p){
  return (
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

async function verifyCaptcha(token){
  const r = await fetch("https://www.google.com/recaptcha/api/siteverify",{
    method:"POST",
    headers:{ "Content-Type":"application/x-www-form-urlencoded" },
    body:`secret=${RECAPTCHA_SECRET}&response=${token}`
  });
  const d = await r.json();
  return d.success === true;
}

export async function register(req,res){
  try {
    const { email, password, cpf, captcha } = req.body || {};

    if (!email || !password || !cpf || !captcha)
      return res.status(400).json({ ok:false });

    if (!isStrongPassword(password))
      return res.status(400).json({ ok:false, error:"WEAK_PASSWORD" });

    if (!(await verifyCaptcha(captcha)))
      return res.status(403).json({ ok:false, error:"CAPTCHA_INVALID" });

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean))
      return res.status(400).json({ ok:false, error:"CPF_INVALID" });

    if (findUserByCPF(cpfClean) || findUserByEmail(email))
      return res.status(409).json({ ok:false, error:"USER_EXISTS" });

    const hash = await bcrypt.hash(password,10);
    const now = Date.now();

    upsertUser({
      id:String(now),
      email,
      cpf:cpfClean,
      password:hash,
      plan:"free",
      verified:true,
      createdAt:now,
      updatedAt:now
    });

    res.json({ ok:true });

  } catch {
    res.status(500).json({ ok:false });
  }
}

export async function login(req,res){
  try {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ ok:false });

    const ok = await bcrypt.compare(password,user.password);
    if (!ok) return res.status(401).json({ ok:false });

    const token = jwt.sign(
      { id:user.id, email:user.email, cpf:user.cpf, plan:user.plan },
      JWT_SECRET,
      { expiresIn:"7d" }
    );

    res.json({ ok:true, token });

  } catch {
    res.status(500).json({ ok:false });
  }
}