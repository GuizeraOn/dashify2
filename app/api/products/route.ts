import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parseVendas } from '@/lib/parsers/vendas';
import { filterVendasByDate } from '@/lib/kpis';
import { VendasRow } from '@/lib/types';

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

/**
 * Catalogo de codigos ja conhecidos.
 *
 * O codigo do produto nao esta na planilha de vendas — so no JSON cru que a
 * Perfect Pay manda, guardado na aba Log_Webhooks. E esse log e curto: hoje
 * tem 113 linhas e cobre so os ultimos dias, entao um produto que nao vendeu
 * recentemente simplesmente nao aparece la.
 *
 * Por isso o que se descobre fica guardado: uma vez visto, o codigo vale para
 * sempre, mesmo depois de o log girar.
 */
interface CodeCatalog {
  products: Record<string, ProductCode>;
  /** Quando o log foi varrido pela ultima vez. */
  checked_at: string | null;
}

/**
 * Intervalo minimo entre varreduras do log.
 *
 * Sem ele, um produto que simplesmente nao esta no log — porque vendeu antes
 * da janela que ele guarda — faria a varredura acontecer em toda visita, ja
 * que ele nunca deixa de estar faltando. Com o intervalo, a busca por um
 * codigo novo continua acontecendo, mas de meia em meia hora em vez de a cada
 * carregamento de pagina.
 */
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
    // Nao vale derrubar a pagina por causa do cache do catalogo.
    console.error('Could not persist product codes:', error.message);
  }
}

/**
 * Varre o log de webhooks atras de codigos ainda desconhecidos.
 *
 * So e chamada quando falta algum — em regime normal o catalogo guardado ja
 * responde por todos, e esta leitura (que custa ~1,3s e 350 KB) nao acontece.
 */
async function discoverCodes(sheets: any, spreadsheetId: string) {
  const found: Record<string, ProductCode> = {};

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Log_Webhooks!C:C',
    });

    for (const row of (response.data.values || [])) {
      try {
        const payload = JSON.parse(row[0]);
        const product = payload?.product;
        if (!product?.code || !product?.name) continue;

        found[String(product.name).trim()] = {
          code: String(product.code),
          guarantee: typeof product.guarantee === 'number' ? product.guarantee : null,
        };
      } catch {
        // Linha do log que nao e JSON valido: ignora e segue.
      }
    }
  } catch (error: any) {
    console.error('Webhook log unavailable:', error.message);
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

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const [vendasResponse, catalog] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'db_vendas!A:W' }),
      loadCatalog(),
    ]);

    const allVendas = parseVendas(vendasResponse.data.values || []);
    const vendas = filterVendasByDate(allVendas, dateStart, dateEnd);

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

    /**
     * Catalogo: o que ja estava guardado, mais o que faltar.
     *
     * A varredura do log so acontece quando algum produto em tela ainda nao
     * tem codigo. Descobriu, guarda — e nas proximas visitas nem o log nem a
     * gravacao acontecem.
     */
    let codes = catalog.products;

    const missing = Object.keys(totals).some((name) => !codes[name]);
    const lastCheck = catalog.checked_at ? Date.parse(catalog.checked_at) : 0;
    const isStale = Date.now() - lastCheck > RESCAN_INTERVAL_MS;

    if (missing && isStale) {
      const discovered = await discoverCodes(sheets, spreadsheetId);
      codes = { ...catalog.products, ...discovered };

      // Grava sempre que varre, mesmo sem achar nada novo: e o carimbo que
      // impede a proxima visita de varrer de novo.
      await saveCatalog({ products: codes, checked_at: new Date().toISOString() });
    }

    const products = Object.values(totals).map((item) => {
      const known = codes[item.name];

      return {
        ...item,
        code: known?.code || null,
        checkout_url: known?.code ? CHECKOUT_BASE + known.code : null,
        guarantee: known?.guarantee ?? null,
        // Ticket medio pela venda aprovada, que e a unica que entrou dinheiro.
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

    // Front-end primeiro, depois os upsells na ordem do funil; dentro de cada
    // etapa, o que faturou mais.
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
