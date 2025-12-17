// buscar.js

// 🔹 API (Render)
const API = "https://nexus-site-oufm.onrender.com";

// pega o q da URL (ex: buscar.html?q=notebook)
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(name) || "").trim();
}

function formatBRL(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstChild;
}

async function main() {
  const q = getQueryParam("q") || getQueryParam("query"); // aceita os dois, mas manda q
  const plan = (getQueryParam("plan") || "free").trim();

  const meta = document.getElementById("search-meta");
  const grid = document.getElementById("results-grid");

  if (!q) {
    meta.textContent = "Digite algo para buscar (ex: notebook i5, headset, monitor 144Hz).";
    return;
  }

  meta.textContent = `Buscando: "${q}" • plano: ${plan}`;

  try {
    const resp = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&plan=${encodeURIComponent(plan)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data || data.ok === false) {
      const msg = (data && (data.error || data.message)) || "Falha ao buscar produtos.";
      grid.innerHTML = "";
      grid.appendChild(
        el(`<div class="card-info"><h3>Não consegui buscar agora</h3><p>${msg}</p></div>`)
      );
      return;
    }

    const items = data.items || data.products || data.results || [];
    grid.innerHTML = "";

    if (!items.length) {
      grid.appendChild(
        el(`<div class="card-info"><h3>Nenhum resultado</h3><p>Tenta outro termo (ex: “Ryzen 7”, “SSD 1TB”, “monitor 27”).</p></div>`)
      );
      return;
    }

    items.forEach((p) => {
      const title = p.title || p.name || "Produto";
      const store = p.store || p.seller || "";
      const img = p.image || p.imageUrl || p.thumbnail || "";
      const pricePublic = p.pricePublic ?? p.price ?? p.publicPrice;
      const pricePremium = p.pricePremium ?? p.premiumPrice;

      const href =
        p.url ||
        (p.id ? `produto.html?id=${encodeURIComponent(p.id)}` : "#");

      const badgeBest = p.badge === "best" || p.isBestDeal ? `<span class="badge badge-best">Melhor</span>` : "";
      const badgeFrete = p.freeShipping ? `<span class="badge badge-frete">Frete grátis</span>` : "";

      grid.appendChild(
        el(`
          <article class="result-card">
            <div class="result-thumb">
              ${
                img
                  ? `<img src="${img}" alt="${title}" onerror="this.parentElement.innerHTML='<div class=\\'thumb-placeholder\\'>Sem imagem</div>'" />`
                  : `<div class="thumb-placeholder">Sem imagem</div>`
              }
            </div>

            <div class="result-body">
              <div class="result-header">
                <h2>${title}</h2>
                ${badgeBest}
                ${badgeFrete}
              </div>

              <div class="result-store">${store ? `Loja: ${store}` : ""}</div>

              <div class="result-prices">
                ${pricePublic != null ? `<div class="price-current">${formatBRL(pricePublic)}</div>` : ""}
                ${
                  pricePremium != null
                    ? `<div class="price-original">Premium: ${formatBRL(pricePremium)}</div>`
                    : ""
                }
              </div>

              <div class="result-actions">
                <a class="btn-outline" href="${href}">Ver produto</a>
              </div>
            </div>
          </article>
        `)
      );
    });
  } catch (err) {
    console.error("BUSCAR ERROR:", err);
    grid.innerHTML = "";
    grid.appendChild(
      el(`<div class="card-info"><h3>Erro de conexão</h3><p>Não foi possível conectar ao servidor da Nexus agora.</p></div>`)
    );
  }
}

document.addEventListener("DOMContentLoaded", main);
