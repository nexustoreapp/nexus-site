const API = "https://nexus-site-oufm.onrender.com";

/* ===============================
   ELEMENTOS
================================ */
const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim();
const plan = (localStorage.getItem("nexus_user_plan") || "free").toLowerCase();

/* ===============================
   PREÇO
================================ */
function money(v) {
  if (v == null) return "Sob consulta";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ===============================
   CARD
================================ */
function card(p) {
  const d = document.createElement("div");
  d.className = "result-card";

  d.innerHTML = `
    <div class="card-image">
      ${p.image ? `<img src="${p.image}" alt="${p.title}" />` : ""}
    </div>

    <div class="card-body">
      <div class="card-title">${p.title}</div>
      <div class="card-price">${money(p.pricePublic)}</div>

      <a class="btn-primary" href="${p.url}" target="_blank">
        Ver no fornecedor
      </a>
    </div>
  `;

  return d;
}

/* ===============================
   LOAD SEARCH (CJ)
================================ */
async function loadSearch() {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  const url = `${API}/api/dropship/search?q=${encodeURIComponent(
    q
  )}&plan=${encodeURIComponent(plan)}&page=1&limit=24`;

  const r = await fetch(url);
  if (!r.ok) throw new Error("Erro na busca");

  const data = await r.json();
  const produtos = data.produtos || [];

  meta.innerText = `${produtos.length} produto(s) encontrados`;

  if (!produtos.length) {
    grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  produtos.forEach((p) => grid.appendChild(card(p)));
}

loadSearch().catch((err) => {
  console.error(err);
  meta.innerText = "Erro ao buscar produtos";
});
