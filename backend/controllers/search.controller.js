import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   CARREGA CATÁLOGO
================================ */
function carregarCatalogo() {
  try {
    const caminhos = [
      path.join(__dirname, "..", "data", "catalogo.json"),
      path.join(process.cwd(), "backend", "data", "catalogo.json"),
      path.join(process.cwd(), "data", "catalogo.json"),
    ];

    for (const p of caminhos) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    }

    console.warn("[SEARCH] catálogo.json não encontrado");
    return [];
  } catch (err) {
    console.error("[SEARCH] Erro ao carregar catálogo:", err);
    return [];
  }
}

/* ===============================
   NORMALIZA TEXTO
================================ */
function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ===============================
   SEED DIÁRIA (ROTACAO)
================================ */
function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/* ===============================
   SHUFFLE COM SEED
================================ */
function shuffle(array, seed) {
  let currentIndex = array.length;
  let random;
  let s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  while (currentIndex !== 0) {
    random = Math.floor(Math.abs(Math.sin(s++)) * currentIndex);
    currentIndex--;
    [array[currentIndex], array[random]] = [array[random], array[currentIndex]];
  }
  return array;
}

/* ===============================
   QUERY → INTENÇÕES (SINÔNIMOS)
   Resolve: "pc gamer", "notebook gamer", "headset gamer" etc.
================================ */
function expandQuery(qNorm) {
  if (!qNorm) return [];

  // tokens base
  const tokens = qNorm.split(/\s+/).filter(Boolean);

  // dicionário simples de intenção (você pode expandir depois)
  const intent = [];

  const has = (t) => tokens.includes(t);

  // "pc gamer" ou "computador gamer"
  if ((has("pc") || has("computador")) && has("gamer")) {
    intent.push("pc", "computador", "gabinete", "cpu", "processador", "gpu", "placa de video", "ram", "ssd");
  }

  // "notebook gamer"
  if (has("notebook") && has("gamer")) {
    intent.push("notebook");
  }

  // "headset gamer"
  if (has("headset") || (has("fone") && has("gamer"))) {
    intent.push("headset", "fone");
  }

  // "mouse gamer"
  if (has("mouse")) intent.push("mouse");

  // "teclado gamer"
  if (has("teclado")) intent.push("teclado");

  // "monitor gamer"
  if (has("monitor")) intent.push("monitor");

  // se tiver "gamer" sozinho, amplia um pouco
  if (has("gamer") && intent.length === 0) {
    intent.push("headset", "mouse", "teclado", "monitor", "notebook", "placa de video");
  }

  // junta tokens originais + intenções
  const all = Array.from(new Set([...tokens, ...intent]));
  return all;
}

/* ===============================
   MATCH: produto vs tokens
================================ */
function productText(p) {
  return normalize(
    [
      p.title,
      p.subtitle,
      p.brand,
      p.category,
      p.description,
      (p.tags || []).join(" "),
    ].join(" ")
  );
}

function matchTokens(prodText, tokens) {
  // regra: se usuário digitou 2+ palavras, exigir pelo menos 1 token forte
  // para não ficar 0 resultados (busca mais permissiva)
  if (!tokens.length) return true;

  // se tem muitos tokens, basta bater em 1–2
  let hits = 0;
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (prodText.includes(t)) hits++;
    if (hits >= 1) return true; // permissivo, evita "0 resultados"
  }
  return false;
}

/* ===============================
   PAGINAÇÃO
================================ */
function paginate(items, page, limit) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(60, Math.max(1, Number(limit) || 24)); // limit máx 60
  const start = (p - 1) * l;
  const end = start + l;
  return {
    page: p,
    limit: l,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / l)),
    items: items.slice(start, end),
  };
}

/* ===============================
   CONTROLLER FINAL
================================ */
export const searchController = {
  catalog(req, res) {
    try {
      const q = normalize(req.query.q || "");
      const plan = (req.query.plan || "free").toLowerCase();
      const page = req.query.page || 1;
      const limit = req.query.limit || 24;

      let produtos = carregarCatalogo();

      // se não tem query, devolve catálogo (paginado)
      if (!q) {
        // FREE: rotação + amostra parcial
        if (plan === "free") {
          const seed = getDailySeed();
          produtos = shuffle(produtos, seed);
          produtos = produtos.slice(0, Math.max(1, Math.floor(produtos.length * 0.3)));
        }

        const pag = paginate(produtos, page, limit);
        return res.json({
          ok: true,
          query: q,
          plan,
          page: pag.page,
          limit: pag.limit,
          total: pag.total,
          totalPages: pag.totalPages,
          produtos: pag.items,
        });
      }

      // busca inteligente (tokens + intenções)
      const tokens = expandQuery(q);
      const scored = [];

      for (const p of produtos) {
        const txt = productText(p);
        if (matchTokens(txt, tokens)) {
          // score simples: quantos tokens bate
          let score = 0;
          for (const t of tokens) if (txt.includes(t)) score++;
          scored.push({ p, score });
        }
      }

      // ordena por score + featured
      scored.sort((a, b) => {
        const fa = a.p.featured ? 1 : 0;
        const fb = b.p.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return b.score - a.score;
      });

      let resultados = scored.map((x) => x.p);

      // FREE: rotação diária + amostra parcial (depois de filtrar)
      if (plan === "free") {
        const seed = getDailySeed() + "|q:" + q; // muda por dia + por termo
        resultados = shuffle(resultados, seed);
        resultados = resultados.slice(0, Math.max(1, Math.floor(resultados.length * 0.3)));
      }

      const pag = paginate(resultados, page, limit);

      return res.json({
        ok: true,
        query: q,
        plan,
        page: pag.page,
        limit: pag.limit,
        total: pag.total,
        totalPages: pag.totalPages,
        produtos: pag.items,
      });
    } catch (err) {
      console.error("[SEARCH] ERRO:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno na busca",
      });
    }
  },
};
