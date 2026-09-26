import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parsePerfectPayPayload, detectCurrency } from '@/lib/parsers/perfectpay';
import { getExchangeRateToBrl } from '@/lib/currency';
import type { PerfectPayWebhookPayload } from '@/lib/types';
import { sendSalePushNotification } from '@/lib/push-service';

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

    // Identifica a moeda real do payload (BRL, USD, ARS, COP, MXN, CLP, EUR, etc.)
    const currency = detectCurrency(payload as PerfectPayWebhookPayload);
    const fxRate = currency !== 'BRL' ? await getExchangeRateToBrl(currency) : 1.0;

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

    // Se a venda estiver aprovada, dispara notificação Web Push para PC e celulares cadastrados
    if (parsedSale.status === 'aprovado') {
      sendSalePushNotification(parsedSale).catch((pushErr) => {
        console.error('Erro ao disparar notificação push da venda:', pushErr);
      });
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
