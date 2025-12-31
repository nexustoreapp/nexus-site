import { Router } from "express";

const router = Router();

// heurística simples por país -> região
function countryToRegion(cc) {
  const c = (cc || "").toUpperCase();

  if (c === "BR") return "BR";

  // África (lista básica)
  const AFR = new Set([
    "DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CG","CD","CI","DJ",
    "EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG",
    "MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO",
    "ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"
  ]);
  if (AFR.has(c)) return "AF";

  // Europa (lista básica)
  const EU = new Set([
    "AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
    "IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT",
    "RO","RU","SM","RS","SK","SI","ES","SE","CH","TR","UA","GB"
  ]);
  if (EU.has(c)) return "EU";

  // EUA/Canadá
  if (c === "US" || c === "CA") return "US";

  // padrão
  return "INT";
}

router.get("/region", (req, res) => {
  // Render/Cloudflare/Proxies costumam mandar país
  const country =
    req.headers["cf-ipcountry"] ||
    req.headers["x-vercel-ip-country"] ||
    req.headers["x-country-code"] ||
    req.headers["x-geo-country"] ||
    "";

  const region = countryToRegion(country);

  return res.json({
    ok: true,
    country: country || null,
    region
  });
});

export default router;