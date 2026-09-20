import { NextResponse, NextRequest } from 'next/server';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';
import { calculateKPIs, filterVendasByDate } from '@/lib/kpis';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    let dateStart = searchParams.get('dateStart') || undefined;
    let dateEnd = searchParams.get('dateEnd') || undefined;
    const campaign = searchParams.get('campaign');
    const product = searchParams.get('product');

    // Simple period resolution
    const now = new Date();
    
    // Helper para formatar YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (period === 'today') {
      dateStart = formatDate(now);
      dateEnd = dateStart;
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      dateStart = formatDate(yesterday);
      dateEnd = dateStart;
    } else if (period === 'last_7_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      dateStart = formatDate(start);
      dateEnd = formatDate(now);
    } else if (period === 'last_14_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 13);
      dateStart = formatDate(start);
      dateEnd = formatDate(now);
    } else if (period === 'last_30_days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      dateStart = formatDate(start);
      dateEnd = formatDate(now);
    } else if (period === 'this_month') {
      dateStart = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      dateEnd = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (period === 'last_month') {
      dateStart = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      dateEnd = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (period === 'maximum') {
      dateStart = undefined;
      dateEnd = undefined;
    }

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

    return NextResponse.json({ 
      kpis, 
      metadata: { dateStart, dateEnd },
      daily_stats,
      payment_stats,
      card_approval_stats,
      available_products
    });
  } catch (error: any) {
    console.error('Error calculating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
