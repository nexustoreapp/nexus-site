const API = window.NEXUS_API;

let page = 1;
let loading = false;
let finished = false;
let currentQuery = "";

function getToken(){
  return localStorage.getItem("nexus_token") || "";
}

function parseToken(){

  const token=getToken();
  if(!token) return null;

  try{
    return JSON.parse(atob(token.split(".")[1]));
  }catch{
    return null;
  }

}

function getPlan(){

  const user=parseToken();
  return (user?.plan || "free").toLowerCase();

}

function getQuery(){

  const url=new URL(window.location.href);
  return (url.searchParams.get("q") || "").trim();

}

function formatBRL(n){

  return Number(n || 0).toLocaleString("pt-BR",{
    style:"currency",
    currency:"BRL"
  });

}

function ensureContainers(){

  let meta=document.getElementById("search-meta");
  let grid=document.getElementById("results-grid");
  let fallback=document.getElementById("results");

  if(!meta && fallback){

    meta=document.createElement("div");
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

function appendProducts(grid,products){

  if(!grid) return;

  const html=products.map(p=>{

    const lockBadge=p.blocked
      ? `<span class="badge" style="background:#3a0f16;color:#ffb3bf;">🔒 Bloqueado</span>`
      : `<span class="badge" style="background:#0f2a1b;color:#9ef0b8;">✅ Liberado</span>`;

    const action=p.blocked
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

  grid.insertAdjacentHTML("beforeend",html);

}

window.__buyTestProduct=function(encodedSku){

  const sku=decodeURIComponent(encodedSku || "");

  localStorage.setItem("nexus_product_intent",sku);

  window.location.href=`checkout.html?plan=core_test&sku=${encodeURIComponent(sku)}`;

};

async function loadProducts(meta,grid){

  if(loading || finished) return;

  loading=true;

  try{

    const plan=getPlan();

    const headers={};
    const token=getToken();

    if(token){
      headers.Authorization=`Bearer ${token}`;
    }

    const resp=await fetch(
      `${API}/products?q=${encodeURIComponent(currentQuery)}&plan=${encodeURIComponent(plan)}&page=${page}&limit=20`,
      {headers}
    );

    const data=await resp.json();

    if(!data.ok){
      finished=true;
      return;
    }

    if(!data.products.length){

      finished=true;

      if(page===1){
        renderEmpty(meta,grid,currentQuery);
      }

      return;

    }

    appendProducts(grid,data.products);

    if(meta){
      meta.textContent=`${data.total} produto(s) encontrado(s).`;
    }

    page++;

  }
  catch(err){

    console.error(err);

    if(meta){
      meta.textContent="Erro ao buscar produtos.";
    }

  }

  loading=false;

}

function initInfiniteScroll(meta,grid){

  window.addEventListener("scroll",()=>{

    const scrollPosition=window.innerHeight + window.scrollY;
    const threshold=document.body.offsetHeight - 400;

    if(scrollPosition >= threshold){
      loadProducts(meta,grid);
    }

  });

}

async function bootSearch(){

  const q=getQuery();
  currentQuery=q;

  const {meta,grid}=ensureContainers();

  if(!q){

    if(meta) meta.textContent="Digite algo para pesquisar.";
    return;

  }

  page=1;
  finished=false;
  grid.innerHTML="";

  await loadProducts(meta,grid);

  initInfiniteScroll(meta,grid);

}

bootSearch();