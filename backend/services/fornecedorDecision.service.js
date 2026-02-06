/**
 * fornecedorDecision.service.js
 *
 * Responsável por decidir QUAL fornecedor atenderá um pedido,
 * com base em regras automáticas (SLA, risco, margem, disponibilidade).
 *
 * ❗ Nada manual
 * ❗ Nada duplicado
 * ❗ Arquivo único e oficial
 */

import catalogo from "../data/catalogo/index.js";

/**
 * Avalia fornecedores possíveis para um produto
 */
function avaliarFornecedores(produtoId) {
  const fornecedores = catalogo.fornecedores?.[produtoId] || [];

  return fornecedores
    .map(f => {
      const score =
        (f.sla_score * 0.4) +
        (f.margem_score * 0.3) +
        (f.risco_score * 0.3);

      return {
        ...f,
        score
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Decide o fornecedor final para o pedido
 */
export function decidirFornecedor({ produtoId, quantidade }) {
  const avaliados = avaliarFornecedores(produtoId);

  if (!avaliados.length) {
    return {
      ok: false,
      motivo: "SEM_FORNECEDOR_DISPONIVEL"
    };
  }

  const escolhido = avaliados[0];

  if (escolhido.estoque < quantidade) {
    return {
      ok: false,
      motivo: "ESTOQUE_INSUFICIENTE",
      fornecedor: escolhido.id
    };
  }

  return {
    ok: true,
    fornecedor: {
      id: escolhido.id,
      nome: escolhido.nome,
      sla: escolhido.sla,
      margem: escolhido.margem,
      risco: escolhido.risco
    }
  };
}