import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "nexus-secret";

export function sign(payload, exp="7d"){
  return jwt.sign(payload, SECRET, { expiresIn: exp });
}
export function verify(token){
  return jwt.verify(token, SECRET);
}