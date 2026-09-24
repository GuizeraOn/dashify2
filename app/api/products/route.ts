import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSupabaseAdmin } from '@/lib/supabase';
import { filterVendasByDate } from '@/lib/kpis';
import { VendasRow } from '@/lib/types';
import { fetchSales } from '@/lib/sales-service';

/**
 * Prefixo do checkout. O codigo do produto da Perfect Pay completa a URL.
 */
const CHECKOUT_BASE = 'https://go.centerpag.com/';

/** Onde o catalogo de codigos fica guardado entre uma visita e outra. */
const CODES_SETTING_KEY = 'product_codes';

interface ProductCode {
  code: string;
  /** Dias de garantia declarados no produto. */
  guarantee: number | null;
}

interface CodeCatalog {
  products: Record<string, ProductCode>;
  /** Quando o catalogo foi varrido pela ultima vez. */
  checked_at: string | null;
}

const RESCAN_INTERVAL_MS = 30 * 60 * 1000;

async function loadCatalog(): Promise<CodeCatalog> {
  try {
    const { data } = await getSupabaseAdmin()
      .from('app_settings')
      .select('value')
      .eq('key', CODES_SETTING_KEY)
      .single();

    const value = data?.value as any;
    if (!value) return { products: {}, checked_at: null };

    // Formato antigo: o mapa de produtos estava na raiz.
    if (!value.products) return { products: value, checked_at: null };

    return { products: value.products || {}, checked_at: value.checked_at || null };
  } catch {
    return { products: {}, checked_at: null };
  }
}

async function saveCatalog(catalog: CodeCatalog) {
  try {
    await getSupabaseAdmin()
      .from('app_settings')
      .upsert({ key: CODES_SETTING_KEY, value: catalog }, { onConflict: 'key' });
  } catch (error: any) {
    console.error('Could not persist product codes:', error.message);
  }
}

/**
 * Varre a tabela sales no Supabase atrás de códigos de produto ainda desconhecidos.
 */
async function discoverCodesFromSupabase(): Promise<Record<string, ProductCode>> {
  const found: Record<string, ProductCode> = {};
  try {
    const { data } = await getSupabaseAdmin()
      .from('sales')
      .select('product_name, product_code')
      .not('product_code', 'is', null);

    for (const row of (data || [])) {
      const name = (row.product_name || '').trim();
      const code = (row.product_code || '').trim();
      if (name && code && !found[name]) {
        found[name] = {
          code,
          guarantee: 7,
        };
      }
    }
  } catch (error: any) {
    console.error('Could not discover product codes from Supabase:', error.message);
  }

  return found;
}

interface ProductTotals {
  name: string;
  funnel_step: string;
  code: string | null;
  checkout_url: string | null;
  guarantee: number | null;
  sales: number;
  revenue: number;
  gross_revenue: number;
  /** Todas as tentativas do periodo, aprovadas ou nao. */
  attempts: number;
  refunded: number;
  refunded_value: number;
  pending: number;
  cancelled: number;
  countries: Record<string, number>;
  payment_methods: Record<string, number>;
}

function blank(name: string): ProductTotals {
  return {
    name,
    funnel_step: '',
    code: null,
    checkout_url: null,
    guarantee: null,
    sales: 0,
    revenue: 0,
    gross_revenue: 0,
    attempts: 0,
    refunded: 0,
    refunded_value: 0,
    pending: 0,
    cancelled: 0,
    countries: {},
    payment_methods: {},
  };
}

/** Ordena um mapa de contagens e devolve os maiores. */
function top(counts: Record<string, number>, limit: number) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const [vendasRows, catalog] = await Promise.all([
      fetchSales({ dateStart, dateEnd }),
      loadCatalog(),
    ]);

    const vendas = filterVendasByDate(vendasRows, dateStart, dateEnd);

    const totals: Record<string, ProductTotals> = {};

    vendas.forEach((row: VendasRow) => {
      const name = (row.produto || '').trim();
      if (!name) return;

      if (!totals[name]) totals[name] = blank(name);
      const item = totals[name];

      if (!item.funnel_step && row.funnel_step) item.funnel_step = row.funnel_step;

      item.attempts += 1;

      const status = row.status.toLowerCase().trim();

      if (status === 'aprovado') {
        item.sales += 1;
        item.revenue += row.net_revenue_brl || 0;
        item.gross_revenue += row.gross_revenue_brl || 0;

        // Pais e meio de pagamento so contam na venda que valeu.
        const country = row.country || 'Desconhecido';
        item.countries[country] = (item.countries[country] || 0) + 1;

        const method = row.payment_method || 'desconhecido';
        item.payment_methods[method] = (item.payment_methods[method] || 0) + 1;
      } else if (status === 'reembolsado') {
        item.refunded += 1;
        item.refunded_value += row.net_revenue_brl || 0;
      } else if (status === 'cancelado') {
        item.cancelled += 1;
      } else {
        item.pending += 1;
      }
    });

    let codes = catalog.products;

    const missing = Object.keys(totals).some((name) => !codes[name]);
    const lastCheck = catalog.checked_at ? Date.parse(catalog.checked_at) : 0;
    const isStale = Date.now() - lastCheck > RESCAN_INTERVAL_MS;

    if (missing && isStale) {
      const discovered = await discoverCodesFromSupabase();
      codes = { ...catalog.products, ...discovered };

      await saveCatalog({ products: codes, checked_at: new Date().toISOString() });
    }

    const products = Object.values(totals).map((item) => {
      const known = codes[item.name];

      return {
        ...item,
        code: known?.code || null,
        checkout_url: known?.code ? CHECKOUT_BASE + known.code : null,
        guarantee: known?.guarantee ?? null,
        average_ticket: item.sales > 0 ? item.revenue / item.sales : 0,
        approval_rate: item.attempts > 0 ? (item.sales / item.attempts) * 100 : 0,
        top_countries: top(item.countries, 3),
        top_payment_methods: top(item.payment_methods, 2),
        countries: undefined,
        payment_methods: undefined,
      };
    });

    const totalRevenue = products.reduce((sum, item) => sum + item.revenue, 0);

    products.forEach((item: any) => {
      item.revenue_share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
    });

    products.sort((a, b) => {
      if (a.funnel_step !== b.funnel_step) return a.funnel_step.localeCompare(b.funnel_step);
      return b.revenue - a.revenue;
    });

    return NextResponse.json({
      products,
      total_revenue: totalRevenue,
      checkout_base: CHECKOUT_BASE,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
