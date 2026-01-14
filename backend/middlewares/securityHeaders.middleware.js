// backend/middlewares/securityHeaders.middleware.js

export function securityHeaders(req, res, next) {

  // Evita MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Protege contra clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS básico
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer controlado
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // HTTPS forçado (Render já usa HTTPS)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Política de permissões
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // CSP básica (não quebra frontend)
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://nexus-site-oufm.onrender.com",
      "frame-src https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  );

  next();
}