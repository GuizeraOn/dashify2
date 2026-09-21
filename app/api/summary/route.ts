import { NextResponse, NextRequest } from 'next/server';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';
import { calculateKPIs, filterVendasByDate } from '@/lib/kpis';
import { getSupabaseAdmin } from '@/lib/supabase';
import { resolvePeriod } from '@/lib/dates';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const campaign = searchParams.get('campaign');
    const product = searchParams.get('product');

    // Periodo resolvido no fuso do negocio (ver lib/dates.ts). Datas soltas na
    // query continuam valendo quando nenhum periodo nomeado e informado.
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    let metaQuery = getSupabaseAdmin().from('meta_ads_insights').select('*');
    if (dateStart) metaQuery = metaQuery.gte('date', dateStart);
    if (dateEnd) metaQuery = metaQuery.lte('date', dateEnd);

    const [metaResult, vendasResponse, settingsResult] = await Promise.all([
      metaQuery,
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'db_vendas!A:S' }),
      getSupabaseAdmin().from('app_settings').select('value').eq('key', 'front_products').single()
    ]);

    if (metaResult.error) {
      throw new Error('Supabase Meta fetch failed: ' + metaResult.error.message);
    }

    // Default to empty array if no settings found or error
    const frontProducts = settingsResult.data?.value || [];

    let metaData = metaResult.data || [];
    let vendasData = parseVendas(vendasResponse.data.values || []);

    // Meta data is already date filtered by Supabase
    vendasData = filterVendasByDate(vendasData, dateStart, dateEnd);

    // Extract unique products before filtering to populate the dropdown
    const available_products = Array.from(new Set(vendasData.map(v => v.produto).filter(Boolean))).sort();

    if (campaign && campaign !== 'all') {
      metaData = metaData.filter(row => row.campaign_name === campaign);
    }

    if (product && product !== 'qualquer') {
      vendasData = vendasData.filter(row => row.produto === product);
    }

    const kpis = calculateKPIs(metaData, vendasData, frontProducts);

    // Grouping for charts
    const dailyMap: Record<string, { date: string; revenue: number; spend: number }> = {};
    
    metaData.forEach(row => {
      const date = row.date.substring(0,10);
      if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, spend: 0 };
      dailyMap[date].spend += row.spend;
    });

    vendasData.forEach(row => {
      if (row.status.toLowerCase().trim() === 'aprovado') {
        const date = row.date.substring(0,10);
        if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, spend: 0 };
        dailyMap[date].revenue += row.net_revenue_brl;
      }
    });

    const daily_stats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const paymentMap: Record<string, number> = {};
    vendasData.forEach(row => {
      if (row.status.toLowerCase().trim() === 'aprovado') {
        const pm = row.payment_method || 'outros';
        paymentMap[pm] = (paymentMap[pm] || 0) + row.net_revenue_brl;
      }
    });
    
    const payment_stats = Object.entries(paymentMap).map(([name, value]) => ({ name, value }));

    // Card approval stats: aprovadas vs recusadas (todas as vendas cartão/crédito)
    const CARD_KEYWORDS = ['cartão', 'cartao', 'credit', 'crédito', 'credito'];
    const isCardPayment = (pm: string) => CARD_KEYWORDS.some(kw => pm.toLowerCase().includes(kw));

    const cardVendas = vendasData.filter(row => isCardPayment(row.payment_method));
    const cardApproved = cardVendas.filter(row => row.status.toLowerCase().trim() === 'aprovado').length;
    const cardTotal = cardVendas.length;
    const cardRefused = cardTotal - cardApproved;
    const cardApprovalRate = cardTotal > 0 ? (cardApproved / cardTotal) * 100 : 0;

    // Breakdown por status do cartão
    const cardStatusMap: Record<string, number> = {};
    cardVendas.forEach(row => {
      const s = row.status.trim() || 'Desconhecido';
      cardStatusMap[s] = (cardStatusMap[s] || 0) + 1;
    });
    const card_approval_stats = {
      approved: cardApproved,
      refused: cardRefused,
      total: cardTotal,
      approval_rate: Math.round(cardApprovalRate * 10) / 10,
      breakdown: Object.entries(cardStatusMap).map(([status, count]) => ({ status, count }))
    };

    // Funil de conversao: do clique no anuncio ate a venda aprovada.
    // As tres primeiras etapas vem do Meta; as duas ultimas, da planilha.
    const sum = (field: string) => metaData.reduce((total, row) => total + (Number(row[field]) || 0), 0);

    // Preferimos o clique no link ao clique total (que inclui curtida, comentario
    // e expandir imagem). Algumas contas nao reportam inline_link_clicks — nesse
    // caso o total de cliques e o unico numero disponivel.
    const linkClicks = sum('link_clicks');
    const clicks = linkClicks > 0 ? linkClicks : sum('clicks');

    // So produtos de front entram na ultima etapa: order bump e upsell acontecem
    // depois do checkout e inflariam a conversao do anuncio. Mesma regra do CPA
    // — sem produtos de front configurados, conta todas as aprovadas.
    const approvedVendas = vendasData.filter(
      row => row.status.toLowerCase().trim() === 'aprovado'
    );
    const approvedCount = frontProducts.length > 0
      ? approvedVendas.filter(row => frontProducts.includes(row.produto)).length
      : approvedVendas.length;

    const funnel_stats = {
      // Usou o clique no link ou caiu para o clique total? A interface avisa.
      clicks_are_link_clicks: linkClicks > 0,
      // Verdadeiro quando a ultima etapa esta restrita aos produtos de front.
      approved_is_front_only: frontProducts.length > 0,
      steps: [
        { key: 'clicks', label: 'Cliques', count: clicks },
        { key: 'landing_page_views', label: 'Vis. Página', count: sum('landing_page_views') },
        { key: 'initiate_checkout', label: 'ICs', count: sum('initiate_checkout') },
        { key: 'approved', label: 'Vendas Apr.', count: approvedCount },
      ],
    };

    return NextResponse.json({ 
      kpis, 
      metadata: { dateStart, dateEnd },
      daily_stats,
      payment_stats,
      card_approval_stats,
      funnel_stats,
      available_products
    });
  } catch (error: any) {
    console.error('Error calculating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
