import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parsePerfectPayPayload } from '@/lib/parsers/perfectpay';
import { getUsdToBrlRate } from '@/lib/currency';
import type { PerfectPayWebhookPayload } from '@/lib/types';

/**
 * Receptor de Webhooks da Perfect Pay
 *
 * Recebe postbacks de vendas, pagamentos, aprovações, estornos e cancelamentos.
 * A operação é idempotente (upsert baseado em 'code').
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Perfect Pay Webhook endpoint is active and ready to receive POST notifications.'
  });
}

export async function POST(request: NextRequest) {
  try {
    let payload: any;
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        payload = await request.json();
      } else if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
      ) {
        const formData = await request.formData();
        const obj: Record<string, any> = {};
        formData.forEach((value, key) => {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              obj[key] = JSON.parse(value);
              return;
            } catch {}
          }
          obj[key] = value;
        });
        payload = obj;
      } else {
        // Fallback: tenta json, se falhar tenta text -> JSON
        try {
          payload = await request.json();
        } catch {
          const text = await request.text();
          payload = JSON.parse(text);
        }
      }
    } catch (parseError: any) {
      console.error('Falha ao processar corpo do webhook:', parseError);
      return NextResponse.json({ error: 'Invalid payload: could not parse body' }, { status: 400 });
    }

    // Taxa de câmbio USD -> BRL se a moeda for dólar
    const isUsd = payload?.currency_enum === 2 || payload?.currency_enum_key === 'USD';
    const fxRate = isUsd ? await getUsdToBrlRate() : 1.0;

    // Normalização do payload para o modelo canônico SalesRow
    const parsedSale = parsePerfectPayPayload(payload as PerfectPayWebhookPayload, fxRate);

    if (!parsedSale.code) {
      return NextResponse.json(
        { error: 'Missing sale code in payload' },
        { status: 400 }
      );
    }

    // Upsert no Supabase (idempotente)
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
