import { NextResponse } from 'next/server';
import { fetchSalesPulse } from '@/lib/sales-service';

/**
 * Assinatura da base de vendas do Supabase.
 *
 * Serve para o dashboard saber que chegou informação nova sem recarregar tudo por precaução:
 * o cliente compara a assinatura a cada consulta e só recarrega quando ela muda.
 *
 * A assinatura é computada instantaneamente (<30ms) a partir de COUNT(*) e MAX(updated_at).
 */
export async function GET() {
  try {
    const { rows, signature } = await fetchSalesPulse();
    return NextResponse.json({ rows, signature });
  } catch (error: any) {
    console.error('Sales pulse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
