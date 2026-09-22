export interface MetaRow {
  key: string;
  date: string;
  hour: number;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  updated_at: string;
}

export interface VendasRow {
  key: string;
  date: string;
  cliente: string;
  produto: string;
  funnel_step: string;
  gross_value_usd: number;
  net_value_usd: number;
  gross_revenue_brl: number;
  net_revenue_brl: number;
  country: string;
  payment_method: string;
  status: string;
  utm_source: string;
  /** Colunas T..W do script de captura. Vazias em vendas anteriores a ele. */
  utm_campaign: string;
  utm_medium: string;
  utm_content: string;
  utm_term: string;
  phone: string;
}

export interface KPIs {
  spend: number;
  net_revenue: number;
  profit: number;
  roi: number | null;
  roas: number | null;
  cpa: number | null;
  profit_margin: number | null;
  pending_revenue: number;
  refunded_revenue: number;
  refunded_count: number;
}
