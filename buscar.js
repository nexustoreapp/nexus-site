const API = "https://nexus-site-oufm.onrender.com";

/* ===== ELEMENTOS ===== */
let grid = document.getElementById("results-grid");
let meta = document.getElementById("search-meta");

if (!meta) {
  meta = document.createElement("div");
  meta.id = "search-meta";
  document.body.prepend(meta);
}
if (!grid) {
  grid = document.createElement("div");
  grid.id = "results-grid";
  document.body.appendChild(grid);
}

/* ===== PARAMS ===== */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim();
const plan = (localStorage.getItem("nexus_user_plan") || "free").toLowerCase();

/* ===== RENDER ===== */
function card(p) {
  const d = document.createElement("div");
  d.style.border = "1px solid #444";
  d.style.padding = "12px";
  d.style.margin = "10px 0";
  d.style.borderRadius = "8px";

  const price =
    plan === "free"
      ? (p.pricePublic ?? p.pricePremium)
      : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <strong>${p.title}</strong><br>
    <small>${p.subtitle || ""}</small><br>
    <b>R$ ${price}</b>
  `;
  return d;
}

/* ===== BUSCA ===== */
(async () => {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  try {
    // 1️⃣ tenta com q
    let r = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&plan=${plan}`);
    let data = await r.json();

    let produtos = data.produtos || [];

    // 2️⃣ fallback TOTAL (se vier vazio)
    if (!produtos.length) {
      r = await fetch(`${API}/api/search?plan=${plan}`);
      data = await r.json();
      produtos = data.produtos || [];
    }

    meta.innerText = `Produtos encontrados: ${produtos.length}`;

    if (!produtos.length) {
      grid.innerHTML = "<p>Nenhum produto retornado da API.</p>";
      console.error("API RETORNOU VAZIO:", data);
      return;
    }

    produtos.forEach(p => grid.appendChild(card(p)));
  } catch (e) {
    meta.innerText = "Erro ao conectar na API.";
    console.error(e);
  }
})();
