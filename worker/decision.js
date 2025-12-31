// worker/decision.js

// region ex: "BR", "EU", "AF", "US"
// preference: "best" | "national" | "cheapest"

export function decideBestOffer(offers, region, preference = "best") {
  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;

    // 🔹 Preço pesa mais
    score += (1000 - o.totalPrice);

    // 🔹 Localidade
    if (o.origin === region) score += 400;
    if (isNear(o.origin, region)) score += 200;

    // 🔹 Prazo
    score += (30 - o.deliveryDays) * 10;

    // 🔹 Preferência do cliente
    if (preference === "national" && o.origin !== region) continue;
    if (preference === "cheapest") score = 1000 - o.totalPrice;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }

  return best;
}

function isNear(origin, region) {
  const map = {
    BR: ["BR", "AR", "CL", "UY"],
    EU: ["EU", "UK"],
    AF: ["AF", "EU"],
    US: ["US", "CA"]
  };
  return map[region]?.includes(origin);
}