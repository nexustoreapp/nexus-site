// checkout.js

function getToken() {
  return localStorage.getItem("nexus_token");
}

function planCatalog() {
  return {
    free:  { id: "plan_free",  title: "Plano Free",  amountCents: 0 },
    core:  { id: "plan_core",  title: "Plano Core",  amountCents: 1990 },
    hyper: { id: "plan_hyper", title: "Plano Hyper", amountCents: 3990 },
    omega: { id: "plan_omega", title: "Plano Omega", amountCents: 6990 },

/* ===============================
INICIO_PLANO_TESTE
Plano oculto para testar pagamento real
=============================== */

    core_teste: { id: "plan_core_teste", title: "Plano Core Teste", amountCents: 1 }

/* ===============================
FIM_PLANO_TESTE
=============================== */

  };
}

function getSelectedPlan() {
  const url = new URL(window.location.href);
  const planKey = (url.searchParams.get("plan") || "core").toLowerCase();
  const cat = planCatalog();
  return cat[planKey] || cat.core;
}

async function createPayment() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const plan = getSelectedPlan();

  if (plan.amountCents <= 0) {
    alert("Esse plano é grátis. Nada para pagar.");
    window.location.href = "minha-conta.html";
    return;
  }

  const body = {
    items: [
      { id: plan.id, title: plan.title, quantity: 1, unit_price: plan.amountCents / 100 }
    ],
    amountCents: plan.amountCents,
    currency: "BRL"
  };

  const r = await fetch(`${NEXUS_API}/payment/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(body)
  });

  const d = await r.json().catch(() => null);

  const out = document.getElementById("result");
  if (out) out.textContent = JSON.stringify(d, null, 2);

  if (!d?.ok) {
    alert(d?.error || "Erro ao criar pagamento.");
    return;
  }

  const link = d.init_point || d.sandbox_init_point;
  if (!link) {
    alert("Pagamento criado, mas sem link do Mercado Pago.");
    return;
  }

  window.location.href = link;
}

function bootUI() {
  const plan = getSelectedPlan();

  const nameEl = document.getElementById("productName");
  const priceEl = document.getElementById("planPrice");

  if (nameEl) nameEl.textContent = plan.title;
  if (priceEl) priceEl.textContent = `R$ ${(plan.amountCents / 100).toFixed(2)}`;

  const btn = document.getElementById("payBtn");
  if (btn) btn.addEventListener("click", createPayment);
}

bootUI();