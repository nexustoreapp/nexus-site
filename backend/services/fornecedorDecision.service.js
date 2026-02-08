// backend/services/fornecedorDecision.service.js

/**
 * DECISÃO DE FORNECEDOR – NEXUS
 * 100% automática
 * Nenhuma ação manual
 */

const fornecedores = [
  {
    id: "FORN_A",
    nome: "Fornecedor A",
    slaDias: 5,
    risco: 0.12, // 12%
    ativo: true
  },
  {
    id: "FORN_B",
    nome: "Fornecedor B",
    slaDias: 8,
    risco: 0.06, // 6%
    ativo: true
  },
  {
    id: "FORN_C",
    nome: "Fornecedor C",
    slaDias: 3,
    risco: 0.22, // 22%
    ativo: false
  }
];

/**
 * Seleciona fornecedor automaticamente
 * Critérios:
 * 1. Ativo
 * 2. Menor risco
 * 3. Melhor SLA
 */
export function decidirFornecedor({ productSnapshot }) {
  const candidatos = fornecedores.filter(f => f.ativo);

  if (candidatos.length === 0) {
    return {
      ok: false,
      reason: "NO_ACTIVE_SUPPLIER"
    };
  }

  const escolhido = candidatos.sort((a, b) => {
    // risco pesa mais que SLA
    if (a.risco !== b.risco) {
      return a.risco - b.risco;
    }
    return a.slaDias - b.slaDias;
  })[0];

  return {
    ok: true,
    fornecedor: {
      id: escolhido.id,
      nome: escolhido.nome,
      slaDias: escolhido.slaDias,
      risco: escolhido.risco
    }
  };
}