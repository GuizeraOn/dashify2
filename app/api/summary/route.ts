import { NextResponse, NextRequest } from 'next/server';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';
import { calculateKPIs, filterVendasByDate } from '@/lib/kpis';
import { getSupabaseAdmin } from '@/lib/supabase';
import { fetchMetaInsights } from '@/lib/meta-insights';
import { resolvePeriod } from '@/lib/dates';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const campaign = searchParams.get('campaign');
    const product = searchParams.get('product');
    const country = searchParams.get('country');

    // Periodo resolvido no fuso do negocio (ver lib/dates.ts). Datas soltas na
    // query continuam valendo quando nenhum periodo nomeado e informado.
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    // Leitura paginada: no nivel de anuncio a janela passa do limite de 1.000
    // linhas por consulta do PostgREST, que corta sem avisar (ver
    // lib/meta-insights.ts).
    const [metaRows, vendasResponse, settingsResult] = await Promise.all([
      fetchMetaInsights(dateStart, dateEnd),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'db_vendas!A:W' }),
      getSupabaseAdmin().from('app_settings').select('value').eq('key', 'front_products').single()
    ]);

    // Default to empty array if no settings found or error
    const frontProducts = settingsResult.data?.value || [];

    let metaData = metaRows;
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

    // Guardado antes do filtro de pais porque dois consumidores precisam da
    // lista inteira: o ranking/mapa, para calcular a participacao de cada pais,
    // e o funil, cujas etapas do Meta sao sempre globais.
    const vendasBeforeCountryFilter = vendasData;

    if (country && country !== 'todos') {
      vendasData = vendasData.filter(row => row.country === country);
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
    //
    // E de proposito que aqui se ignora o filtro de pais: cliques, visualizacoes
    // e ICs vem do Meta sem separacao geografica. Cruzar vendas de um pais com
    // etapas do mundo inteiro daria uma conversao que nao significa nada.
    const approvedVendas = vendasBeforeCountryFilter.filter(
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
      // Avisa a interface que o funil segue global mesmo com pais filtrado.
      ignores_country_filter: Boolean(country && country !== 'todos'),
      steps: [
        { key: 'clicks', label: 'Cliques', count: clicks },
        { key: 'landing_page_views', label: 'Vis. Página', count: sum('landing_page_views') },
        { key: 'initiate_checkout', label: 'ICs', count: sum('initiate_checkout') },
        { key: 'approved', label: 'Vendas Apr.', count: approvedCount },
      ],
    };

    // Vendas por pais: so as aprovadas, que sao as que viraram dinheiro.
    const countryTotals: Record<string, { revenue: number; orders: number }> = {};
    vendasBeforeCountryFilter.forEach(row => {
      if (row.status.toLowerCase().trim() !== 'aprovado') return;
      const name = row.country || 'Desconhecido';
      if (!countryTotals[name]) countryTotals[name] = { revenue: 0, orders: 0 };
      countryTotals[name].revenue += row.net_revenue_brl || 0;
      countryTotals[name].orders += 1;
    });

    const countriesRevenue = Object.values(countryTotals).reduce((total, c) => total + c.revenue, 0);
    const country_stats = Object.entries(countryTotals)
      .map(([name, totals]) => ({
        country: name,
        revenue: totals.revenue,
        orders: totals.orders,
        share: countriesRevenue > 0 ? (totals.revenue / countriesRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Vendas por dia da semana. Respeita os filtros ativos, inclusive o de
    // pais: a pergunta aqui e "em que dia este recorte vende", e nao existe
    // etapa global como no funil.
    const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekdayTotals = WEEKDAY_LABELS.map(() => ({ revenue: 0, orders: 0 }));

    vendasData.forEach(row => {
      if (row.status.toLowerCase().trim() !== 'aprovado') return;

      // A planilha guarda a data como texto no horario local do negocio.
      // Montando a partir dos numeros para o dia da semana nao escorregar:
      // new Date('2026-09-20') seria lido como UTC e voltaria um dia.
      const [year, month, day] = row.date.substring(0, 10).split('-').map(Number);
      if (!year || !month || !day) return;

      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      weekdayTotals[weekday].revenue += row.net_revenue_brl || 0;
      weekdayTotals[weekday].orders += 1;
    });

    const weekdayRevenue = weekdayTotals.reduce((total, item) => total + item.revenue, 0);
    const weekday_stats = WEEKDAY_LABELS.map((label, index) => ({
      weekday: index,
      label,
      short: label.substring(0, 3),
      revenue: weekdayTotals[index].revenue,
      orders: weekdayTotals[index].orders,
      share: weekdayRevenue > 0 ? (weekdayTotals[index].revenue / weekdayRevenue) * 100 : 0,
    }));

    return NextResponse.json({ 
      kpis, 
      metadata: { dateStart, dateEnd },
      daily_stats,
      payment_stats,
      card_approval_stats,
      funnel_stats,
      country_stats,
      weekday_stats,
      available_products
    });
  } catch (error: any) {
    console.error('Error calculating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
