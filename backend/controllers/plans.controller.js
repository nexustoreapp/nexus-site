// backend/controllers/plans.controller.js

const PLANS = [
  {
    id: "FREE",
    name: "Gratuito",
    price: 0,
    period: "semana",
    features: [
      "Acesso a lojas menores",
      "Só produtos com desconto",
      "Comissão Nexus maior nas compras",
    ],
  },
  {
    id: "PREMIUM_WEEKLY",
    name: "Premium Semanal",
    price: 8.99,
    period: "semana",
    features: [
      "Acesso a todas as lojas (grandes + pequenas)",
      "Comparação mais completa com IA",
      "Comissão Nexus menor",
    ],
  },
  {
    id: "PREMIUM_MONTHLY",
    name: "Premium Mensal",
    price: 16.99,
    period: "mês",
    features: [
      "Todos os recursos do Premium",
      "Melhor custo-benefício para uso contínuo",
    ],
  },
  {
    id: "PREMIUM_YEARLY",
    name: "Premium Anual",
    price: 210.99,
    period: "ano",
    features: [
      "Acesso total ao Nexus durante o ano inteiro",
      "Mais econômico a longo prazo",
      "Comissão Nexus menor nas compras",
    ],
  },
];

export const plansController = {
  list: (req, res) => {
    res.json({
      ok: true,
      plans: PLANS,
    });
  },

  getById: (req, res) => {
    const { id } = req.params;

    const plan = PLANS.find((p) => p.id === id);

    if (!plan) {
      return res.status(404).json({
        ok: false,
        error: "Plano não encontrado",
      });
    }

    res.json({
      ok: true,
      plan,
    });
  },
};
