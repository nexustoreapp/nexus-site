// checkout.js

function generateNonce() {
  return crypto.randomUUID();
}

async function createPayment(plan) {
  const token = localStorage.getItem("nexus_token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const nonce = generateNonce();

  const r = await fetch(`${NEXUS_API}/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
      "X-Nexus-Nonce": nonce
    },
    body: JSON.stringify({ plan })
  });

  const d = await r.json();

  if (!d.ok) {
    if (d.error === "REPLAY_BLOCKED") {
      alert("Tentativa duplicada bloqueada.");
      return;
    }

    alert("Erro ao processar pagamento.");
    return;
  }

  // salva contexto
  localStorage.setItem("nexus_payment_id", d.paymentId);

  // redireciona (PIX ou confirmação)
  window.location.href = "pagamento-pendente.html";
}