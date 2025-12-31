const API = "https://nexus-site-oufm.onrender.com";

async function loadHomeProducts() {
  const r = await fetch(`${API}/api/shopify/products?limit=12`);
  const data = await r.json();
  if (!data.ok) return;

  const grid = document.getElementById("home-products");
  if (!grid) return;

  grid.innerHTML = "";

  data.products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${p.image || 'fallback.png'}" />
      <h3>${p.title}</h3>
      <strong>R$ ${p.price?.toFixed(2) || '—'}</strong>
      <a href="produto.html?handle=${p.handle}">Ver produto</a>
    `;

    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadHomeProducts);