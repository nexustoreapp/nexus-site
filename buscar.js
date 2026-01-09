const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim().toLowerCase();

const token = localStorage.getItem("nexus_token");

function getPlan(){
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.plan || "free";
  } catch {
    return "free";
  }
}

function isBlocked(plan, productId){
  if (plan === "omega") return false;

  const seed = productId + new Date().toDateString();
  let h = 0;
  for (let i=0;i<seed.length;i++) h += seed.charCodeAt(i);
  const m = h % 100;

  if (plan === "free") return m < 70;
  if (plan === "core") return m < 45;
  if (plan === "hyper") return m < 30;

  return true;
}

async function loadSearch() {
  try {
    meta.innerText = "Buscando produtos...";
    grid.innerHTML = "";

    const r = await fetch(`${API}/shopify/products?limit=50`);
    const data = await r.json();

    if (!data.ok) {
      meta.innerText = "Erro ao buscar produtos";
      return;
    }

    const plan = getPlan();
    const produtos = (data.products || []).filter(p =>
      p.title.toLowerCase().includes(q)
    );

    meta.innerText = `${produtos.length} produto(s) encontrados`;

    produtos.forEach(p => {
      const blocked = isBlocked(plan, p.handle);

      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <div class="card-image">
          <img src="${p.image || "fallback.png"}">
        </div>

        <div class="card-body">
          <div class="card-title">${p.title}</div>

          <div class="card-price">
            ${blocked ? "🔒 Produto bloqueado" :
            (p.price ? "R$ " + p.price.toLocaleString("pt-BR") : "Sob consulta")}
          </div>

          <a href="${blocked ? "assinatura.html" :
            `produto.html?handle=${encodeURIComponent(p.handle)}`}"
            class="btn-primary">
            ${blocked ? "Ver planos" : "Ver produto"}
          </a>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("[buscar.js]", err);
    meta.innerText = "Erro ao buscar produtos";
  }
}

loadSearch();