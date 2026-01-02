import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { onlyDigits, isValidCPF } from "../utils/cpf.js";
import { genOTP } from "../utils/otp.js";
import { sign } from "../utils/jwt.js";

const USERS = path.resolve("backend/data/users.json");

function readUsers(){
  if(!fs.existsSync(USERS)) return [];
  return JSON.parse(fs.readFileSync(USERS,"utf-8"));
}
function writeUsers(u){
  fs.writeFileSync(USERS, JSON.stringify(u,null,2));
}

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const AuthController = {
  register: async (req,res)=>{
    const { email, password, cpf } = req.body;
    if(!email || !password || !cpf) return res.status(400).json({ ok:false });

    const cleanCPF = onlyDigits(cpf);
    if(!isValidCPF(cleanCPF)) return res.status(400).json({ ok:false, error:"CPF_INVALID" });

    const users = readUsers();
    if(users.some(u=>u.cpf===cleanCPF)) return res.status(409).json({ ok:false, error:"CPF_EXISTS" });
    if(users.some(u=>u.email===email)) return res.status(409).json({ ok:false, error:"EMAIL_EXISTS" });

    const hash = await bcrypt.hash(password, 10);
    const otp = genOTP();

    const user = {
      id: Date.now().toString(),
      email,
      cpf: cleanCPF,
      password: hash,
      plan: "free",
      verified: false,
      otp,
      createdAt: Date.now()
    };

    users.push(user);
    writeUsers(users);

    await mailer.sendMail({
      to: email,
      subject: "Nexus — Confirmação de cadastro",
      text: `Seu código de confirmação é: ${otp}`
    });

    res.json({ ok:true, message:"OTP_SENT" });
  },

  verifyOTP: (req,res)=>{
    const { email, otp } = req.body;
    const users = readUsers();
    const u = users.find(x=>x.email===email);
    if(!u || u.otp!==otp) return res.status(400).json({ ok:false });

    u.verified = true;
    u.otp = null;
    writeUsers(users);

    const token = sign({ id:u.id, email:u.email, plan:u.plan });
    res.json({ ok:true, token });
  },

  login: async (req,res)=>{
    const { email, password } = req.body;
    const users = readUsers();
    const u = users.find(x=>x.email===email);
    if(!u) return res.status(401).json({ ok:false });

    const ok = await bcrypt.compare(password, u.password);
    if(!ok) return res.status(401).json({ ok:false });
    if(!u.verified) return res.status(403).json({ ok:false, error:"NOT_VERIFIED" });

    const token = sign({ id:u.id, email:u.email, plan:u.plan });
    res.json({ ok:true, token });
  }
};