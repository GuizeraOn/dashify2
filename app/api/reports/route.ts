import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { fetchSales } from '@/lib/sales-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    // Lista vazia quer dizer todos. 'qualquer' ainda e aceito por causa de
    // links antigos, de quando o filtro era de um produto so.
    const products = searchParams.getAll('product').filter(item => item && item !== 'qualquer');
    
    // Periodo resolvido no fuso do negocio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const vendasData = await fetchSales({
      dateStart,
      dateEnd,
      products: products.length > 0 ? products : undefined,
    });

    // 1. Heatmap Data (Count of sales by DayOfWeek and HourOfDay)
    // Structure: Array of { day: 0-6 (0=Sun), hour: 0-23, count: number }
    const heatmapMap: Record<string, number> = {};
    
    // 2. Funnel Data
    const funnelMap: Record<string, number> = {};

    // 3. Country Data
    const countryMap: Record<string, number> = {};

    vendasData.forEach(row => {
      // Funnel
      const step = row.funnel_step || 'Desconhecida';
      funnelMap[step] = (funnelMap[step] || 0) + 1;

      // Only count Aprovado/Completo for revenue rankings
      const statusLower = row.status.toLowerCase();
      if (statusLower.includes('aprovado') || statusLower.includes('completo')) {
        const country = row.country || 'Desconhecido';
        countryMap[country] = (countryMap[country] || 0) + (row.net_revenue_brl || 0);
      }

      // Heatmap
      if (row.date) {
        const parts = row.date.split(' ');
        if (parts.length === 2) {
          let dateObj = new Date(row.date.replace(' ', 'T')); // Try ISO-like YYYY-MM-DDTHH:MM:SS
          if (isNaN(dateObj.getTime())) {
            // Try DD/MM/YYYY
            const dParts = parts[0].split('/');
            if (dParts.length === 3) {
              dateObj = new Date(`${dParts[2]}-${dParts[1]}-${dParts[0]}T${parts[1]}`);
            }
          }
          if (!isNaN(dateObj.getTime())) {
            const day = dateObj.getDay(); // 0 = Sunday
            const hour = dateObj.getHours(); // 0-23
            const key = `${day}-${hour}`;
            heatmapMap[key] = (heatmapMap[key] || 0) + 1;
          }
        }
      }
    });

    // Formatting for frontend
    const heatmapData = Object.keys(heatmapMap).map(key => {
      const [day, hour] = key.split('-');
      return { day: Number(day), hour: Number(hour), count: heatmapMap[key] };
    });

    const funnelData = Object.keys(funnelMap).map(step => ({
      step,
      count: funnelMap[step]
    })).sort((a, b) => b.count - a.count); // sort descending by count

    const countryData = Object.keys(countryMap).map(country => ({
      country,
      revenue: countryMap[country]
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5); // top 5

    return NextResponse.json({ 
      heatmapData,
      funnelData,
      countryData
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
