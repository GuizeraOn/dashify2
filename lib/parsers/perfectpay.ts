import type { SalesRow, PerfectPayWebhookPayload } from '../types';

const countryMap: Record<string, string> = {
  spain: 'Espanha',
  espana: 'Espanha',
  mexico: 'México',
  brasil: 'Brasil',
  brazil: 'Brasil',
  portugal: 'Portugal',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  usa: 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  argentina: 'Argentina',
  colombia: 'Colômbia',
  chile: 'Chile',
  uruguay: 'Uruguai',
  uruguai: 'Uruguai',
  paraguay: 'Paraguai',
  paraguai: 'Paraguai',
  peru: 'Peru',
  ecuador: 'Equador',
  equador: 'Equador',
  bolivia: 'Bolívia',
  panama: 'Panamá',
  'costa rica': 'Costa Rica',
  'el salvador': 'El Salvador',
  guatemala: 'Guatemala',
  honduras: 'Honduras',
  nicaragua: 'Nicarágua',
  'puerto rico': 'Porto Rico',
  'porto rico': 'Porto Rico',
  'dominican republic': 'República Dominicana',
  'republica dominicana': 'República Dominicana',
  switzerland: 'Suíça',
  suica: 'Suíça',
  france: 'França',
  franca: 'França',
  germany: 'Alemanha',
  alemanha: 'Alemanha',
  italy: 'Itália',
  italia: 'Itália',
  'united kingdom': 'Reino Unido',
  'reino unido': 'Reino Unido',
  canada: 'Canadá',
  venezuela: 'Venezuela',
  ar: 'Argentina',
  bo: 'Bolívia',
  br: 'Brasil',
  ca: 'Canadá',
  ch: 'Suíça',
  cl: 'Chile',
  co: 'Colômbia',
  cr: 'Costa Rica',
  de: 'Alemanha',
  do: 'República Dominicana',
  ec: 'Equador',
  es: 'Espanha',
  fr: 'França',
  gb: 'Reino Unido',
  gt: 'Guatemala',
  hn: 'Honduras',
  it: 'Itália',
  mx: 'México',
  ni: 'Nicarágua',
  pa: 'Panamá',
  pe: 'Peru',
  pr: 'Porto Rico',
  pt: 'Portugal',
  py: 'Paraguai',
  sv: 'El Salvador',
  us: 'Estados Unidos',
  uy: 'Uruguai',
  ve: 'Venezuela',
};

export function normalizeCountry(val?: string | null): string {
  if (!val) return 'Brasil';
  const key = val
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  return countryMap[key] || val.trim();
}

/**
 * Mapeia o sale_status_enum da Perfect Pay para os status canônicos do Dashify:
 * 'aprovado' | 'aguardando' | 'cancelado' | 'reembolsado' | 'estornado' | 'recusado' | 'outro'
 */
export function mapStatus(statusEnum?: number | null): string {
  if (statusEnum === undefined || statusEnum === null) return 'outro';

  switch (statusEnum) {
    case 1: // pending
    case 3: // in_process
    case 4: // in_mediation
    case 16: // in_review
      return 'aguardando';

    case 2: // approved
    case 8: // authorized
    case 10: // completed
      return 'aprovado';

    case 6: // cancelled
    case 13: // expired
      return 'cancelado';

    case 7: // refunded
      return 'reembolsado';

    case 9: // charged_back
      return 'estornado';

    case 5: // rejected
    case 11: // checkout_error
      return 'recusado';

    default:
      return 'outro';
  }
}

/**
 * Identifica o meio de pagamento canônico a partir dos enums ou texto
 */
export function mapPaymentMethod(
  paymentTypeEnum?: number | null,
  paymentMethodEnum?: number | null,
  detail?: string | null
): string {
  const detailLower = (detail || '').toLowerCase();
  if (detailLower.includes('pix')) return 'pix';

  if (paymentTypeEnum === 2 || paymentMethodEnum === 2) {
    return 'boleto';
  }

  if (paymentTypeEnum === 3) {
    return 'paypal';
  }

  if (
    paymentTypeEnum === 1 ||
    paymentTypeEnum === 4 ||
    paymentTypeEnum === 6 ||
    [1, 3, 4, 5, 6, 7].includes(paymentMethodEnum || 0)
  ) {
    return 'cartão de crédito';
  }

  return 'cartão de crédito';
}

/**
 * Extrai a comissão líquida do produtor ou desconta taxas da Perfect Pay e afiliados
 */
export function calculateNetRevenue(
  saleAmount: number,
  commissions?: Array<{ affiliation_type_enum?: number; commission_amount?: number | string }>
): number {
  if (!commissions || !Array.isArray(commissions) || commissions.length === 0) {
    return saleAmount;
  }

  // 1. Tentar encontrar a comissão do produtor diretamente (affiliation_type_enum === 1)
  const producer = commissions.find((c) => c.affiliation_type_enum === 1);
  if (producer && producer.commission_amount !== undefined && producer.commission_amount !== null) {
    const val = Number(producer.commission_amount);
    if (Number.isFinite(val) && val > 0) {
      return val;
    }
  }

  // 2. Se não houver produtor explícito, subtrair taxas de plataforma (0) e afiliados (5)
  let deductions = 0;
  for (const c of commissions) {
    if (c.affiliation_type_enum === 0 || c.affiliation_type_enum === 5) {
      const val = Number(c.commission_amount) || 0;
      if (Number.isFinite(val) && val > 0) {
        deductions += val;
      }
    }
  }

  const net = saleAmount - deductions;
  return Number.isFinite(net) && net > 0 ? net : saleAmount;
}

/**
 * Detecta a moeda efetiva do payload.
 * Dá prioridade a currency_paid (ex: ARS, COP, CLP, MXN, USD) se informado,
 * senão consulta currency_enum_key ou currency_enum.
 */
export function detectCurrency(payload: PerfectPayWebhookPayload): string {
  const anyPayload = payload as any;
  const paid = anyPayload?.currency_paid;
  if (paid && typeof paid === 'string' && paid.trim()) {
    return paid.trim().toUpperCase();
  }

  const key = anyPayload?.currency_enum_key;
  if (key && typeof key === 'string' && key.trim()) {
    return key.trim().toUpperCase();
  }

  if (payload.currency_enum === 2) return 'USD';
  if (payload.currency_enum === 3) return 'EUR';
  if (payload.currency_enum === 1) return 'BRL';

  return 'BRL';
}

/**
 * Normaliza o payload bruto do webhook da Perfect Pay para o modelo SalesRow da tabela sales
 */
export function parsePerfectPayPayload(
  payload: PerfectPayWebhookPayload,
  fxRate: number = 1.0
): SalesRow {
  const code = String(payload.code || '').trim();
  const rawSaleAmount = typeof payload.sale_amount === 'number' 
    ? payload.sale_amount 
    : parseFloat(String(payload.sale_amount || '0').replace(',', '.')) || 0;

  const rawNetRevenue = calculateNetRevenue(rawSaleAmount, payload.commission);

  const currency = detectCurrency(payload);
  const isBrl = currency === 'BRL';
  const effectiveRate = !isBrl && fxRate > 0 ? fxRate : 1.0;

  const grossRevenueBrl = Number((rawSaleAmount * effectiveRate).toFixed(2));
  const netRevenueBrl = Number((rawNetRevenue * effectiveRate).toFixed(2));

  // Data canônica: prioriza data de aprovação se aprovada, senão date_created
  const rawDate = (payload.date_approved || payload.date_created || new Date().toISOString()).trim();
  let parsedDate = rawDate;
  // Se vier no formato "YYYY-MM-DD HH:mm:ss", converte para ISO aceitável pelo postgres
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(rawDate)) {
    parsedDate = rawDate.replace(' ', 'T') + '-03:00'; // Fuso de Brasília
  }

  let dateCreated = payload.date_created ? String(payload.date_created).trim() : null;
  if (dateCreated && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateCreated)) {
    dateCreated = dateCreated.replace(' ', 'T') + '-03:00';
  }

  let dateApproved = payload.date_approved ? String(payload.date_approved).trim() : null;
  if (dateApproved && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateApproved)) {
    dateApproved = dateApproved.replace(' ', 'T') + '-03:00';
  }

  const status = mapStatus(payload.sale_status_enum);
  const paymentMethod = mapPaymentMethod(
    payload.payment_type_enum,
    payload.payment_method_enum,
    payload.sale_status_detail
  );

  const customer = payload.customer;
  const phone = [customer?.phone_area_code, customer?.phone_number].filter(Boolean).join('');

  // Identificação de Funnel Step
  let funnelStep = 'Front-end';
  if (payload.payment_type_enum === 6) {
    funnelStep = 'Upsell';
  } else {
    const combinedName = `${payload.product?.name || ''} ${payload.plan?.name || ''}`.toLowerCase();
    if (combinedName.includes('upsell')) funnelStep = 'Upsell';
    else if (combinedName.includes('bump') || combinedName.includes('order bump')) funnelStep = 'Order Bump';
  }

  return {
    code,
    date: parsedDate,
    date_created: dateCreated,
    date_approved: dateApproved,
    customer_name: customer?.full_name ? String(customer.full_name).trim() : null,
    customer_email: customer?.email ? String(customer.email).trim() : null,
    customer_phone: phone ? String(phone).trim() : null,
    customer_document: customer?.identification_number ? String(customer.identification_number).trim() : null,
    country: normalizeCountry(customer?.country),
    state: customer?.state ? String(customer.state).trim() : null,
    city: customer?.city ? String(customer.city).trim() : null,
    product_code: payload.product?.code ? String(payload.product.code).trim() : null,
    product_name: payload.product?.name ? String(payload.product.name).trim() : 'Produto sem nome',
    plan_code: payload.plan?.code ? String(payload.plan.code).trim() : null,
    plan_name: payload.plan?.name ? String(payload.plan.name).trim() : null,
    funnel_step: funnelStep,
    gross_revenue_brl: grossRevenueBrl,
    net_revenue_brl: netRevenueBrl,
    installments: payload.installments ? Number(payload.installments) : 1,
    payment_method: paymentMethod,
    status,
    sale_status_enum: payload.sale_status_enum ?? null,
    sale_status_detail: payload.sale_status_detail ? String(payload.sale_status_detail).trim() : null,
    utm_source: payload.metadata?.utm_source || payload.metadata?.src || null,
    utm_campaign: payload.metadata?.utm_campaign || null,
    utm_medium: payload.metadata?.utm_medium || null,
    utm_content: payload.metadata?.utm_content || null,
    utm_term: payload.metadata?.utm_term || null,
    src: payload.metadata?.src || null,
    raw_payload: {
      ...(payload as Record<string, unknown>),
      currency,
      fx_rate: effectiveRate,
    },
    updated_at: new Date().toISOString(),
  };
}
