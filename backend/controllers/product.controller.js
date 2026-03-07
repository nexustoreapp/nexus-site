import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

function loadAllProducts() {

  const files = fs.readdirSync(CATALOG_DIR).filter(f => f.endsWith(".json"));

  let products = [];

  for (const file of files) {

    const content = JSON.parse(
      fs.readFileSync(path.join(CATALOG_DIR, file), "utf-8")
    );

    if (Array.isArray(content)) {
      products = products.concat(content);
    }

  }

  return products;

}

/* ===============================
   LISTAR PRODUTOS
================================ */

export function listProducts(req, res) {

  try {

    const q = String(req.query.q || "").toLowerCase();
    const plan = String(req.query.plan || "free").toLowerCase();

    const category = String(req.query.category || "").toLowerCase();

    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);

    const sort = String(req.query.sort || "");

    const page = Math.max(Number(req.query.page || 1),1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20),1),100);

    /* ===============================
       PEGAR EMAIL DO TOKEN
    =============================== */

    let userEmail = "guest";

    const auth = req.headers.authorization || "";

    if (auth.startsWith("Bearer ")) {
      try {

        const token = auth.replace("Bearer ", "");
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString("utf8")
        );

        userEmail = payload.email || "guest";

      } catch {}
    }

    let products = loadAllProducts();

    /* ===============================
       BUSCA TEXTO
    =============================== */

    if (q) {

      products = products.filter(p => {

        const text = `
          ${p.title || ""}
          ${p.subtitle || ""}
          ${p.description || ""}
          ${p.category || ""}
          ${p.brand || ""}
          ${p.sku || ""}
        `.toLowerCase();

        return text.includes(q);

      });

    }

    /* ===============================
       FILTRO CATEGORIA
    =============================== */

    if (category) {

      products = products.filter(p =>
        String(p.category || "").toLowerCase() === category
      );

    }

    /* ===============================
       FILTRO PREÇO
    =============================== */

    if (minPrice) {

      products = products.filter(p =>
        Number(p.pricePublic ?? p.price ?? 0) >= minPrice
      );

    }

    if (maxPrice) {

      products = products.filter(p =>
        Number(p.pricePublic ?? p.price ?? 0) <= maxPrice
      );

    }

    /* ===============================
       ORDENAÇÃO
    =============================== */

    if (sort === "price_asc") {

      products.sort((a,b)=>
        Number(a.pricePublic ?? a.price ?? 0) -
        Number(b.pricePublic ?? b.price ?? 0)
      );

    }

    if (sort === "price_desc") {

      products.sort((a,b)=>
        Number(b.pricePublic ?? b.price ?? 0) -
        Number(a.pricePublic ?? a.price ?? 0)
      );

    }

    if (sort === "name") {

      products.sort((a,b)=>
        String(a.title||"").localeCompare(String(b.title||""))
      );

    }

    const total = products.length;

    /* ===============================
       PAGINAÇÃO
    =============================== */

    const start = (page-1)*limit;
    const end = start + limit;

    products = products.slice(start,end);

    /* ===============================
       RANDOM BLOCK
    =============================== */

    products = products.map(p => {

      const blocked = isBlockedRandomly(
        p.sku || p.id || "",
        plan,
        userEmail
      );

      return {
        ...p,
        blocked
      };

    });

    return res.json({

      ok: true,
      total,
      page,
      limit,
      products

    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok:false,
      error:"PRODUCT_LOAD_ERROR"
    });

  }

}

/* ===============================
   PRODUTO POR SKU
================================ */

export function getProductBySku(req,res){

  try{

    const {sku}=req.params;

    const products=loadAllProducts();

    const product=products.find(p=>p.sku===sku);

    if(!product){

      return res.status(404).json({
        ok:false,
        error:"PRODUCT_NOT_FOUND"
      });

    }

    return res.json({
      ok:true,
      product
    });

  }
  catch(err){

    console.error(err);

    return res.status(500).json({
      ok:false,
      error:"PRODUCT_ERROR"
    });

  }

}