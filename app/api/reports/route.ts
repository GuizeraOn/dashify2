import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const product = searchParams.get('product') || 'qualquer';
    
    // Periodo resolvido no fuso do negocio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period);

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'db_vendas!A:S',
    });

    let vendasData = parseVendas(response.data.values || []);

    // Filter Date
    if (dateStart || dateEnd) {
      vendasData = vendasData.filter(row => {
        if (!row.date) return false;
        const dateStr = row.date.split(' ')[0]; 
        const rowDate = new Date(dateStr.split('/').reverse().join('-')).getTime();
        const start = dateStart ? new Date(dateStart).getTime() : -Infinity;
        const end = dateEnd ? new Date(dateEnd).getTime() : Infinity;
        return rowDate >= start && rowDate <= end;
      });
    }
    
    // Filter Product
    if (product && product !== 'qualquer') {
      vendasData = vendasData.filter(row => row.produto === product);
    }

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
