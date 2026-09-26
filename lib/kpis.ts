import { MetaRow, VendasRow, KPIs } from './types';

/**
 * O gasto declarado pelo Meta nao inclui os 13% de imposto cobrados sobre a
 * fatura. Todo calculo de custo real multiplica por isto.
 */
export const META_TAX_MULTIPLIER = 1.13;

export function calculateKPIs(metaData: MetaRow[], vendasData: VendasRow[], frontProducts: string[] = []): KPIs {
  // 1. Gastos com Anúncios
  const spend = metaData.reduce((sum, row) => sum + (row.spend || 0), 0);

  // 2. Faturamento Líquido (apenas aprovadas)
  const approvedVendas = vendasData.filter(row => 
    row.status.toLowerCase().trim() === 'aprovado'
  );
  const netRevenue = approvedVendas.reduce((sum, row) => sum + (row.net_revenue_brl || 0), 0);

  // 3. Lucro (Descontando 13% de impostos sobre os anúncios do Meta)
  const realSpend = spend * META_TAX_MULTIPLIER;
  const profit = netRevenue - realSpend;

  // 4. ROI
  // Retorno sobre o Investimento: (Faturamento - Custos) / Custos
  const roi = spend > 0 ? (profit / realSpend) : null;

  // 5. ROAS
  // Faturamento Bruto Atribuído / Gasto com Anúncios (apenas o ad spend do Meta)
  const grossRevenueApproved = approvedVendas.reduce((sum, row) => sum + (row.gross_revenue_brl || 0), 0);
  const roas = spend > 0 ? (grossRevenueApproved / spend) : null;

  // 6. CPA
  // Conta apenas produtos "front" se existirem na config, senao conta todos
  let countApproved = 0;
  if (frontProducts.length > 0) {
    countApproved = approvedVendas.filter(row => frontProducts.includes(row.produto)).length;
  } else {
    countApproved = approvedVendas.length;
  }
  
  const cpa = countApproved > 0 ? (realSpend / countApproved) : null;

  // 7. Margem de Lucro
  const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : null;

  // 8. Vendas Pendentes
  const pendingVendas = vendasData.filter(row => 
    row.status.toLowerCase().trim() === 'aguardando'
  );
  const pendingRevenue = pendingVendas.reduce((sum, row) => sum + (row.gross_revenue_brl || 0), 0);

  const refundedVendas = vendasData.filter(row => 
    ['reembolsado', 'reembolsada', 'estornado', 'estornada', 'refunded'].includes(row.status.toLowerCase().trim())
  );
  const refundedRevenue = refundedVendas.reduce((sum, row) => sum + (row.gross_revenue_brl || 0), 0);
  const refundedCount = refundedVendas.length;

  // 10. Resultados (Vendas Aprovadas direto da PerfectPay)
  const results = approvedVendas.length;

  // 11. Métricas Gerais de Campanha (Meta Ads) e Conversão de Checkout
  const totalICs = metaData.reduce((sum, row: any) => sum + (Number(row.initiate_checkout) || 0), 0);
  const checkoutConversion = totalICs > 0 ? (results / totalICs) * 100 : null;
  const costPerIC = totalICs > 0 ? spend / totalICs : null;

  const totalImpressions = metaData.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0);
  const totalClicks = metaData.reduce((sum, row) => sum + (Number(row.clicks) || 0), 0);
  const totalLinkClicks = metaData.reduce((sum, row: any) => sum + (Number(row.link_clicks) || 0), 0);
  const effectiveClicks = totalLinkClicks > 0 ? totalLinkClicks : totalClicks;

  const cpc = effectiveClicks > 0 ? spend / effectiveClicks : null;
  const ctr = totalImpressions > 0 ? (effectiveClicks / totalImpressions) * 100 : null;

  const totalLPV = metaData.reduce((sum, row: any) => sum + (Number(row.landing_page_views) || 0), 0);
  const connectRate = effectiveClicks > 0 ? (totalLPV / effectiveClicks) * 100 : null;
  const cpm = totalImpressions > 0 ? (spend / totalImpressions) * 1000 : null;

  return {
    spend,
    net_revenue: netRevenue,
    profit,
    roi,
    roas,
    cpa,
    profit_margin: profitMargin,
    pending_revenue: pendingRevenue,
    refunded_revenue: refundedRevenue,
    refunded_count: refundedCount,
    results,
    checkout_conversion: checkoutConversion,
    initiate_checkout: totalICs,
    cost_per_ic: costPerIC,
    cpc,
    ctr,
    connect_rate: connectRate,
    cpm,
  };
}

export function filterMetaByDate(metaData: MetaRow[], dateStart?: string, dateEnd?: string) {
  if (!dateStart && !dateEnd) return metaData;
  return metaData.filter(row => {
    // Assuming row.date is 'YYYY-MM-DD'
    if (dateStart && row.date < dateStart) return false;
    if (dateEnd && row.date > dateEnd) return false;
    return true;
  });
}

export function filterVendasByDate(vendasData: VendasRow[], dateStart?: string, dateEnd?: string) {
  if (!dateStart && !dateEnd) return vendasData;
  return vendasData.filter(row => {
    // Assuming row.date starts with 'YYYY-MM-DD'
    const justDate = row.date.substring(0, 10);
    if (dateStart && justDate < dateStart) return false;
    if (dateEnd && justDate > dateEnd) return false;
    return true;
  });
}
