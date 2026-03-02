// backend/utils/recaptcha.js

export async function verifyRecaptcha(token, remoteip) {
  const secret = process.env.RECAPTCHA_SECRET;

  // Se não tiver secret configurado, falha (proteção)
  if (!secret) return false;

  // Token vazio? falha
  if (!token) return false;

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (remoteip) params.append("remoteip", remoteip);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json().catch(() => null);
  return !!(data && data.success);
}