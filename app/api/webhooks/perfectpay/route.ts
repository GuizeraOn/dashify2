import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parsePerfectPayPayload } from '@/lib/parsers/perfectpay';
import type { PerfectPayWebhookPayload } from '@/lib/types';

/**
 * Receptor de Webhooks da Perfect Pay
 *
 * Recebe postbacks de vendas, pagamentos, aprovações, estornos e cancelamentos.
 * A segurança é validada via token do postback comparado com PERFECTPAY_WEBHOOK_TOKEN.
 * A operação é idempotente (upsert baseado em 'code').
 */
export async function POST(request: NextRequest) {
  try {
    let payload: PerfectPayWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 1. Validação de Token de Segurança
    const expectedToken = process.env.PERFECTPAY_WEBHOOK_TOKEN;
    if (expectedToken) {
      if (!payload.token || payload.token !== expectedToken) {
        return NextResponse.json(
          { error: 'Unauthorized: invalid or missing webhook token' },
          { status: 401 }
        );
      }
    }

    // 2. Normalização do payload para o modelo canônico SalesRow
    const parsedSale = parsePerfectPayPayload(payload);

    if (!parsedSale.code) {
      return NextResponse.json(
        { error: 'Missing sale code in payload' },
        { status: 400 }
      );
    }

    // 3. Upsert no Supabase (idempotente)
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('sales')
      .upsert(parsedSale, { onConflict: 'code' });

    if (error) {
      console.error('Erro ao gravar venda no Supabase:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: parsedSale.code,
      status: parsedSale.status,
    });
  } catch (err: any) {
    console.error('Erro no processamento do webhook da Perfect Pay:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
