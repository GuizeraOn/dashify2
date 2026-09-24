import { getSupabaseAdmin } from './supabase';
import type { VendasRow, SalesRow } from './types';
import { APP_TIMEZONE } from './dates';

export interface FetchSalesOptions {
  dateStart?: string;
  dateEnd?: string;
  products?: string[];
  campaign?: string;
  country?: string;
  status?: string;
}

const spDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Converte data ISO do banco para string formatada no fuso do negócio (YYYY-MM-DD HH:mm:ss).
 * Garantindo que `substring(0, 10)` resulte sempre na data correta do fuso (YYYY-MM-DD).
 */
export function formatSalesDateInBusinessTz(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  try {
    const parts = spDateFormatter.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return isoDate.substring(0, 19).replace('T', ' ');
  }
}

/**
 * Mapeia uma linha da tabela sales (PostgreSQL) para a interface canônica VendasRow.
 */
export function mapSalesRowToVendasRow(row: any): VendasRow {
  const rawPayload = row.raw_payload || {};
  
  // Capitaliza o status para apresentação visual limpa nos badges (ex: Aprovado, Aguardando)
  let displayStatus = row.status || 'outro';
  if (displayStatus === 'aprovado') displayStatus = 'Aprovado';
  else if (displayStatus === 'aguardando') displayStatus = 'Aguardando';
  else if (displayStatus === 'cancelado') displayStatus = 'Cancelado';
  else if (displayStatus === 'reembolsado') displayStatus = 'Reembolsado';
  else if (row.sale_status_detail) displayStatus = row.sale_status_detail;

  return {
    key: String(row.code || ''),
    date: formatSalesDateInBusinessTz(row.date),
    cliente: String(row.customer_name || ''),
    produto: String(row.product_name || ''),
    funnel_step: String(row.funnel_step || ''),
    gross_value_usd: Number(rawPayload.gross_usd || 0),
    net_value_usd: Number(rawPayload.net_usd || 0),
    gross_revenue_brl: Number(row.gross_revenue_brl || 0),
    net_revenue_brl: Number(row.net_revenue_brl || 0),
    country: String(row.country || 'Desconhecido'),
    payment_method: String(row.payment_method || 'outro'),
    status: displayStatus,
    utm_source: String(row.utm_source || ''),
    utm_campaign: String(row.utm_campaign || ''),
    utm_medium: String(row.utm_medium || ''),
    utm_content: String(row.utm_content || ''),
    utm_term: String(row.utm_term || ''),
    phone: String(row.customer_phone || ''),
  };
}

/**
 * Consulta a tabela sales no Supabase com paginação transparente e filtros opcionais.
 */
export async function fetchSales(options: FetchSalesOptions = {}): Promise<VendasRow[]> {
  const supabase = getSupabaseAdmin();
  const PAGE_SIZE = 1000;
  const allRows: any[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('sales')
      .select('code, date, customer_name, customer_email, customer_phone, customer_document, country, state, city, product_code, product_name, plan_code, plan_name, funnel_step, gross_revenue_brl, net_revenue_brl, installments, payment_method, status, sale_status_enum, sale_status_detail, utm_source, utm_campaign, utm_medium, utm_content, utm_term, src')
      .order('date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (options.dateStart) {
      query = query.gte('date', `${options.dateStart}T00:00:00-03:00`);
    }

    if (options.dateEnd) {
      query = query.lte('date', `${options.dateEnd}T23:59:59.999-03:00`);
    }

    if (options.products && options.products.length > 0) {
      query = query.in('product_name', options.products);
    }

    if (options.country && options.country !== 'todos') {
      query = query.eq('country', options.country);
    }

    if (options.status) {
      query = query.eq('status', options.status.toLowerCase().trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao consultar tabela sales no Supabase:', error.message);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map(mapSalesRowToVendasRow);
}

/**
 * FNV-1a hash de 32 bits para assinatura leve.
 */
function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Gera a assinatura rápida da base de vendas para long-polling do frontend (/api/sales-pulse).
 * Executa em < 30ms diretamente via índices B-Tree no PostgreSQL.
 */
export async function fetchSalesPulse(): Promise<{ rows: number; signature: string }> {
  const supabase = getSupabaseAdmin();

  const [countRes, latestRes] = await Promise.all([
    supabase.from('sales').select('*', { count: 'exact', head: true }),
    supabase.from('sales').select('code, updated_at, status').order('updated_at', { ascending: false }).limit(1),
  ]);

  if (countRes.error) {
    throw new Error(`SalesPulse count error: ${countRes.error.message}`);
  }

  const rows = countRes.count || 0;
  const latest = latestRes.data?.[0];
  const payloadToHash = `${rows}|${latest?.updated_at || ''}|${latest?.code || ''}|${latest?.status || ''}`;

  return {
    rows,
    signature: fnv1a(payloadToHash),
  };
}
