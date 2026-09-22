import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';
import { filterVendasByDate } from '@/lib/kpis';
import { META_TAX_MULTIPLIER } from '@/lib/kpis';
import { VendasRow } from '@/lib/types';

/** Sem acento, sem caixa e sem espaco sobrando. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * O utm_campaign chega pela URL do anuncio, entao pode vir percent-encoded e
 * com "+" no lugar de espaco. Nomes de campanha aqui tem barra vertical,
 * colchete e apostrofo — tudo que a URL costuma transformar.
 */
function normalizeUtm(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    // Percent-encoding malformado: segue com o texto cru.
  }
  return normalize(decoded);
}

interface CampaignTotals {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  initiate_checkout: number;
  meta_purchases: number;
  sales: number;
  revenue: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    // Periodo resolvido no fuso do negocio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    let query = getSupabaseAdmin().from('meta_ads_insights').select('*');
    if (dateStart) query = query.gte('date', dateStart);
    if (dateEnd) query = query.lte('date', dateEnd);

    const sheets = await getSheetsClient();

    const [metaResult, vendasResponse] = await Promise.all([
      query,
      sheets.spreadsheets.values.get({
        spreadsheetId: getSpreadsheetId(),
        range: 'db_vendas!A:W',
      }),
    ]);

    if (metaResult.error) {
      throw new Error('Supabase Error: ' + metaResult.error.message);
    }

    const metaData = metaResult.data || [];

    // 1. Agrega o lado do Meta por campanha.
    const totals: Record<string, CampaignTotals> = {};

    metaData.forEach((row: any) => {
      const id = String(row.campaign_id || '');
      if (!totals[id]) {
        totals[id] = {
          campaign_id: id,
          campaign_name: row.campaign_name || 'Desconhecida',
          spend: 0,
          impressions: 0,
          clicks: 0,
          link_clicks: 0,
          landing_page_views: 0,
          initiate_checkout: 0,
          meta_purchases: 0,
          sales: 0,
          revenue: 0,
        };
      }

      const item = totals[id];
      item.spend += row.spend || 0;
      item.impressions += row.impressions || 0;
      item.clicks += row.clicks || 0;
      item.link_clicks += row.link_clicks || 0;
      item.landing_page_views += row.landing_page_views || 0;
      item.initiate_checkout += row.initiate_checkout || 0;
      item.meta_purchases += row.purchases || 0;
    });

    // 2. Indice para casar o utm_campaign da venda com a campanha do Meta.
    // Aceita tanto o id numerico quanto o nome, porque a URL do anuncio pode
    // levar {{campaign.id}} ou {{campaign.name}}.
    const byId = new Map<string, string>();
    const byName = new Map<string, string>();
    Object.values(totals).forEach((item) => {
      byId.set(item.campaign_id, item.campaign_id);
      byName.set(normalize(item.campaign_name), item.campaign_id);
    });

    const matchCampaign = (utmCampaign: string): string | null => {
      const raw = utmCampaign.trim();
      if (!raw || raw === '-') return null;
      return byId.get(raw) ?? byName.get(normalizeUtm(raw)) ?? null;
    };

    // 3. Atribui as vendas aprovadas da planilha.
    const vendas = filterVendasByDate(
      parseVendas(vendasResponse.data.values || []),
      dateStart,
      dateEnd
    );

    const approved = vendas.filter(
      (row: VendasRow) => row.status.toLowerCase().trim() === 'aprovado'
    );

    let unattributedSales = 0;
    let unattributedRevenue = 0;

    approved.forEach((row) => {
      const campaignId = matchCampaign(row.utm_campaign);

      if (!campaignId || !totals[campaignId]) {
        unattributedSales += 1;
        unattributedRevenue += row.net_revenue_brl || 0;
        return;
      }

      totals[campaignId].sales += 1;
      totals[campaignId].revenue += row.net_revenue_brl || 0;
    });

    // 4. Metricas derivadas. Custo e sempre o gasto com o imposto embutido,
    // igual aos KPIs do resumo.
    const campaigns = Object.values(totals).map((item) => {
      const realSpend = item.spend * META_TAX_MULTIPLIER;

      return {
        ...item,
        ctr: item.impressions > 0 ? (item.link_clicks / item.impressions) * 100 : 0,
        cpc: item.link_clicks > 0 ? item.spend / item.link_clicks : 0,
        // Quanto do clique no link chegou a carregar a pagina.
        lpv_rate: item.link_clicks > 0 ? (item.landing_page_views / item.link_clicks) * 100 : 0,
        // Custo e retorno pelas vendas de verdade, nao pelas do pixel.
        cpa: item.sales > 0 ? realSpend / item.sales : null,
        roas: realSpend > 0 ? item.revenue / realSpend : null,
        profit: item.revenue - realSpend,
      };
    });

    campaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({
      campaigns,
      // Vendas aprovadas que nao casaram com nenhuma campanha: trafego
      // organico, outra fonte, ou anuncio sem utm_campaign na URL.
      unattributed: { sales: unattributedSales, revenue: unattributedRevenue },
    });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
