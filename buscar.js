const API = window.NEXUS_API;

function getToken() {
  return localStorage.getItem("nexus_token") || "";
}

function parseToken() {

  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }

}

function getPlan() {

  const user = parseToken();
  return (user?.plan || "free").toLowerCase();

}

function getQuery() {

  const url = new URL(window.location.href);
  return (url.searchParams.get("q") || "").trim();

}

function formatBRL(n) {

  return Number(n || 0).toLocaleString("pt-BR",{
    style:"currency",
    currency:"BRL"
  });

}

function ensureContainers(){

  let meta = document.getElementById("search-meta");
  let grid = document.getElementById("results-grid");
  let fallback = document.getElementById("results");

  if(!meta && fallback){

    meta = document.createElement("div");
    meta.id="search-meta";
    meta.className="helper";

    fallback.parentNode.insertBefore(meta,fallback);

  }

  if(!grid && fallback){

    fallback.id="results-grid";
    fallback.classList.add("grid");

    grid=fallback;

  }

  return {meta,grid};

}

function renderEmpty(meta,grid,q){

  if(meta) meta.textContent=`Nenhum produto encontrado para "${q}".`;

  if(grid) grid.innerHTML="";

}

function renderProducts(meta,grid,products,q){

  if(!grid) return;

  if(meta){

    meta.textContent=`${products.length} produto(s) encontrado(s) para "${q}".`;

  }

  grid.innerHTML = products.map(p=>{

    const lockBadge = p.blocked
      ? `<span class="badge" style="background:#3a0f16;color:#ffb3bf;">🔒 Bloqueado</span>`
      : `<span class="badge" style="background:#0f2a1b;color:#9ef0b8;">✅ Liberado</span>`;

    const action = p.blocked
      ? `<a class="btn btn-outline" href="assinatura.html">Ver planos</a>`
      : `<a class="btn btn-primary" href="produto.html?sku=${encodeURIComponent(p.sku)}">Ver produto</a>`;

    return `

      <article class="card soft" style="padding:14px;">

        <div style="display:flex;gap:12px;align-items:flex-start;">

          <img
            src="${p.image || "logo.png"}"
            alt="${(p.title||"").replace(/"/g,"&quot;")}"
            style="width:88px;height:88px;object-fit:cover;border-radius:12px;background:#111;"
          />

          <div style="flex:1;min-width:0;">

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              ${lockBadge}
              <span class="badge">${p.category||"geral"}</span>
            </div>

            <h3 style="margin:0 0 6px 0;font-size:18px;">
              ${p.title||"Produto"}
            </h3>

            <div class="helper" style="margin-bottom:8px;">
              ${p.subtitle || p.description || ""}
            </div>

            <div style="font-weight:1000;font-size:18px;margin-bottom:10px;">
              ${formatBRL(p.pricePublic ?? p.price)}
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">

              ${action}

              <!-- TESTE COMPRA -->
              <button
                class="btn btn-ghost"
                type="button"
                onclick="window.__buyTestProduct('${encodeURIComponent(p.sku)}')"
              >
                Testar compra 0,01
              </button>

            </div>

          </div>

        </div>

      </article>

    `;

  }).join("");

}

window.__buyTestProduct=function(encodedSku){

  const sku=decodeURIComponent(encodedSku||"");

  localStorage.setItem("nexus_product_intent",sku);

  window.location.href=`checkout.html?plan=core_test&sku=${encodeURIComponent(sku)}`;

};

async function bootSearch(){

  const q=getQuery();
  const plan=getPlan();

  const {meta,grid}=ensureContainers();

  if(!q){

    if(meta) meta.textContent="Digite algo para pesquisar.";

    if(grid) grid.innerHTML="";

    return;

  }

  try{

    const headers={};

    const token=getToken();

    if(token){

      headers.Authorization=`Bearer ${token}`;

    }

    const resp = await fetch(
      `${API}/products?q=${encodeURIComponent(q)}&plan=${encodeURIComponent(plan)}`,
      {headers}
    );

    const data = await resp.json();

    if(!data.ok || !Array.isArray(data.products)){

      renderEmpty(meta,grid,q);
      return;

    }

    if(!data.products.length){

      renderEmpty(meta,grid,q);
      return;

    }

    renderProducts(meta,grid,data.products,q);

  }
  catch(err){

    console.error(err);

    if(meta) meta.textContent="Erro ao buscar produtos.";

  }

}

bootSearch();