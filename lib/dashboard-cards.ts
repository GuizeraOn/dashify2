/**
 * Catalogo dos cards do painel.
 *
 * Existe porque duas partes distantes precisam da mesma lista: a pagina, que
 * monta os cards, e o seletor do modo de edicao, que precisa dar nome a cada
 * um sem ter acesso ao conteudo deles. Manter a lista aqui evita o modal
 * mostrar "chart-card_approval" para o usuario.
 *
 * A ordem e a que aparece no modal — a mesma do layout padrao.
 */
export interface DashboardCard {
  key: string;
  label: string;
  group: 'Indicadores' | 'Gráficos';
}

export const DASHBOARD_CARDS: DashboardCard[] = [
  { key: 'kpi-net_revenue', label: 'Faturamento Líquido', group: 'Indicadores' },
  { key: 'kpi-spend', label: 'Gastos com Anúncios', group: 'Indicadores' },
  { key: 'kpi-profit', label: 'Lucro', group: 'Indicadores' },
  { key: 'kpi-roi', label: 'ROI', group: 'Indicadores' },
  { key: 'kpi-cpa', label: 'CPA', group: 'Indicadores' },
  { key: 'kpi-roas', label: 'ROAS', group: 'Indicadores' },
  { key: 'kpi-margin', label: 'Margem de Lucro', group: 'Indicadores' },
  { key: 'kpi-pending', label: 'Vendas Pendentes', group: 'Indicadores' },
  { key: 'kpi-refunded', label: 'Reembolsos', group: 'Indicadores' },
  { key: 'kpi-results', label: 'Resultados (Vendas)', group: 'Indicadores' },
  { key: 'kpi-checkout_conv', label: 'Conversão de Checkout', group: 'Indicadores' },
  { key: 'kpi-ics', label: 'Checkouts Iniciados (ICs)', group: 'Indicadores' },
  { key: 'kpi-cost_per_ic', label: 'Custo por IC', group: 'Indicadores' },
  { key: 'kpi-cpc', label: 'CPC', group: 'Indicadores' },
  { key: 'kpi-ctr', label: 'CTR', group: 'Indicadores' },
  { key: 'kpi-connect_rate', label: 'Connect Rate', group: 'Indicadores' },
  { key: 'kpi-cpm', label: 'CPM', group: 'Indicadores' },

  { key: 'chart-revenue_spend', label: 'Faturamento vs Gasto Diário', group: 'Gráficos' },
  { key: 'chart-payment', label: 'Meios de Pagamento', group: 'Gráficos' },
  { key: 'chart-card_approval', label: 'Aprovação do Cartão', group: 'Gráficos' },
  { key: 'chart-funnel', label: 'Funil de Conversão (Meta Ads)', group: 'Gráficos' },
  { key: 'chart-country', label: 'Vendas por País', group: 'Gráficos' },
  { key: 'chart-country_approval', label: 'Aprovação por País', group: 'Gráficos' },
  { key: 'chart-weekday', label: 'Vendas por Dia da Semana', group: 'Gráficos' },
];

export const CARD_GROUPS: DashboardCard['group'][] = ['Indicadores', 'Gráficos'];
