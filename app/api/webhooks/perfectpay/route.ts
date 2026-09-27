import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { parsePerfectPayPayload, detectCurrency } from '@/lib/parsers/perfectpay';
import { getExchangeRateToBrl } from '@/lib/currency';
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

    // 1. Verifica status anterior para evitar e-mails duplicados em retentativas de webhook
    const supabase = getSupabaseAdmin();
    const { data: existingSale } = await supabase
      .from('sales')
      .select('status')
      .eq('code', parsedSale.code)
      .single();
    
    const wasAlreadyApproved = existingSale?.status?.toLowerCase() === 'aprovado';

    // 2. Upsert no Supabase (idempotente)
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

    // 3. Lógica de envio de E-mail de Acesso
    const rawPayload = payload as PerfectPayWebhookPayload;
    const isApprovedNow = rawPayload.sale_status_enum === 2 || parsedSale.status.toLowerCase() === 'aprovado';
    
    if (isApprovedNow && !wasAlreadyApproved && rawPayload.customer?.email) {
      const productName = rawPayload.product?.name || parsedSale.product_name;

      // Busca categorias para ver se é upsell/order bump
      const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'product_categories').single();
      const categories = settings?.value || {};
      const category = categories[productName];

      if (category === 'upsell' || category === 'order_bump') {
        console.log(`E-mail ignorado: Produto "${productName}" está classificado como ${category}.`);
      } else {
        // Verifica se o cliente já teve alguma outra compra aprovada nas últimas 24h
        // Isso previne envio duplo caso o front e upsell cheguem juntos e não estejam categorizados
        const { data: recentSales } = await supabase
          .from('sales')
          .select('code')
          .eq('email', rawPayload.customer.email)
          .eq('status', 'Aprovado')
          .neq('code', parsedSale.code)
          .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentSales && recentSales.length > 0) {
          console.log(`E-mail ignorado: Cliente ${rawPayload.customer.email} já possui compra aprovada nas últimas 24h (possível Upsell).`);
        } else {
          const { sendAccessEmail } = await import('@/lib/email-service');
          // Precisa usar 'await' na Vercel (Serverless), senão a função é morta
          await sendAccessEmail({
            customerName: rawPayload.customer.full_name || 'Cliente',
            customerEmail: rawPayload.customer.email,
            productName: productName,
          });
        }
      }
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
