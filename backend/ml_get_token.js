// backend/ml_get_token.js
import fetch from "node-fetch";

const CLIENT_ID = "8813479283539803";
const CLIENT_SECRET = "4GIwLC3UZBfUFVFRuNddqPxcVG3ourvz";
const CODE = "TG-693a5eb8628b6200013262bf-281552835";
const REDIRECT_URI = "https://www.google.com";

async function getToken() {
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("client_id", CLIENT_ID);
  params.set("client_secret", CLIENT_SECRET);
  params.set("code", CODE);
  params.set("redirect_uri", REDIRECT_URI);

  const resp = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await resp.json();
  console.log("Status:", resp.status);
  console.log(JSON.stringify(data, null, 2));
}

getToken().catch(console.error);
