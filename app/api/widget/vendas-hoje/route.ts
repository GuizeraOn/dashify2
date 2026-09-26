import { NextResponse } from 'next/server';
import { fetchSales } from '@/lib/sales-service';
import { resolvePeriod } from '@/lib/dates';
import { VendasRow } from '@/lib/types';

export async function GET() {
  try {
    const today = resolvePeriod('today');
    const yesterday = resolvePeriod('yesterday');

    const [salesToday, salesYesterday] = await Promise.all([
      fetchSales({ dateStart: today.dateStart, dateEnd: today.dateEnd }),
      fetchSales({ dateStart: yesterday.dateStart, dateEnd: yesterday.dateEnd }),
    ]);

    const approvedToday = salesToday.filter((s: VendasRow) => s.status.toLowerCase() === 'aprovado');
    const approvedYesterday = salesYesterday.filter((s: VendasRow) => s.status.toLowerCase() === 'aprovado');

    const countToday = approvedToday.length;
    const countYesterday = approvedYesterday.length;

    const varCount = countToday - countYesterday;
    const varPercent = countYesterday > 0 ? (varCount / countYesterday) * 100 : (countToday > 0 ? 100 : 0);

    // Historico de horas para o grafico (12 ultimas horas)
    const hours = new Array(12).fill(0);
    const nowHour = new Date().getHours();
    
    // Agrupa as vendas de hoje por hora, para as ultimas 12 horas.
    approvedToday.forEach((s) => {
      const saleDate = new Date(s.date);
      const saleHour = saleDate.getHours();
      
      let diff = nowHour - saleHour;
      if (diff < 0) diff += 24; // caso vire o dia

      if (diff < 12) {
        hours[11 - diff] += 1; // 11 é o mais recente, 0 é o mais antigo
      }
    });

    const totalUsd = approvedToday.reduce((sum, s) => sum + (s.net_value_usd || 0), 0);
    const totalBrl = approvedToday.reduce((sum, s) => sum + (s.net_revenue_brl || 0), 0);
    
    // Taxa de cambio inferida
    const exRate = totalUsd > 0 ? (totalBrl / totalUsd) : 5.5;

    return NextResponse.json({
      vendas_hoje: countToday,
      meta_diaria: 5, // Meta fixa por enquanto
      variacao_vs_ontem: varCount,
      variacao_percentual: varPercent,
      moeda: 'USD',
      taxa_cambio_brl: exRate,
      historico_horas: hours,
      atualizado_em: new Date().toISOString(),
      status: 'online',
      valor_total_usd: totalUsd,
      valor_total_brl: totalBrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
