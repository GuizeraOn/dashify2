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

export interface SalesRow {
  code: string;
  date: string; // ISO string ou YYYY-MM-DD HH:mm:ss
  date_created?: string | null;
  date_approved?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_document?: string | null;
  country: string;
  state?: string | null;
  city?: string | null;
  product_code?: string | null;
  product_name: string;
  plan_code?: string | null;
  plan_name?: string | null;
  funnel_step?: string | null;
  gross_revenue_brl: number;
  net_revenue_brl: number;
  installments?: number | null;
  payment_method: string;
  status: string;
  sale_status_enum?: number | null;
  sale_status_detail?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  src?: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface PerfectPayCommission {
  affiliation_code?: string;
  affiliation_type_enum?: number; // 0: platform, 1: producer, 2: co_producer, 3: affiliate_management, 4: partner, 5: affiliate, 6: premium, 7: provider
  name?: string;
  email?: string;
  identification_number?: string;
  commission_amount?: number | string;
}

export interface PerfectPayProduct {
  code: string;
  name: string;
  external_reference?: string;
  guarantee?: number;
}

export interface PerfectPayPlan {
  code?: string;
  name?: string;
  quantity?: number;
}

export interface PerfectPayCustomer {
  customer_type_enum?: number;
  full_name?: string;
  email?: string;
  identification_type?: string;
  identification_number?: string;
  birthday?: string;
  phone_area_code?: string;
  phone_number?: string;
  country?: string;
  state?: string;
  city?: string;
  zip_code?: string;
  street_name?: string;
  street_number?: string;
  district?: string;
  complement?: string;
}

export interface PerfectPayMetadata {
  src?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  utm_perfect?: string | null;
}

export interface PerfectPayWebhookPayload {
  token: string;
  code: string;
  sale_amount: number | string;
  currency_enum?: number;
  coupon_code?: string | null;
  installments?: number;
  installment_amount?: number | null;
  shipping_type_enum?: number;
  shipping_amount?: number | null;
  payment_method_enum?: number;
  payment_type_enum?: number;
  billet_url?: string;
  billet_number?: string | null;
  billet_expiration?: string | null;
  quantity?: number;
  sale_status_enum: number;
  sale_status_detail?: string;
  date_created: string;
  date_approved?: string | null;
  product?: PerfectPayProduct;
  plan?: PerfectPayPlan;
  plan_itens?: unknown[];
  customer?: PerfectPayCustomer;
  metadata?: PerfectPayMetadata;
  webhook_owner?: string;
  commission?: PerfectPayCommission[];
  marketplaces?: Record<string, unknown>;
  [key: string]: unknown;
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
  // Métricas gerais de campanha e PerfectPay
  results: number;
  checkout_conversion: number | null;
  initiate_checkout: number;
  cost_per_ic: number | null;
  cpc: number | null;
  ctr: number | null;
  connect_rate: number | null;
  cpm: number | null;
}
