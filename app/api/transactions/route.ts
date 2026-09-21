import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';
import { parseVendas } from '@/lib/parsers/vendas';

const filterByDate = (data: any[], start?: string, end?: string) => {
  if (!start && !end) return data;
  return data.filter(row => {
    if (!row.date) return false;
    const dateStr = row.date.split(' ')[0]; 
    const rowDate = new Date(dateStr.split('/').reverse().join('-')).getTime();
    const startDate = start ? new Date(start).getTime() : -Infinity;
    const endDate = end ? new Date(end).getTime() : Infinity;
    return rowDate >= startDate && rowDate <= endDate;
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const product = searchParams.get('product') || 'qualquer';
    
    // Periodo resolvido no fuso do negocio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'db_vendas!A:S',
    });

    let vendasData = parseVendas(response.data.values || []);
    vendasData = filterByDate(vendasData, dateStart, dateEnd);
    
    if (product && product !== 'qualquer') {
      vendasData = vendasData.filter(row => row.produto === product);
    }

    // Sort by most recent first based on original row index (since they usually append at the bottom)
    // Wait, parseVendas returns them in top-down order. Usually sheets are appended at the bottom.
    // Let's just reverse the array so newest is first.
    vendasData.reverse();

    return NextResponse.json({ transactions: vendasData });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
