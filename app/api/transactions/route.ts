import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { fetchSales } from '@/lib/sales-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    // Lista vazia quer dizer todos. 'qualquer' ainda é aceito por compatibilidade retroativa.
    const products = searchParams.getAll('product').filter(item => item && item !== 'qualquer');
    
    // Período resolvido no fuso do negócio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    const transactions = await fetchSales({
      dateStart,
      dateEnd,
      products: products.length > 0 ? products : undefined,
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
