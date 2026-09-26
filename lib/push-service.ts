import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { SalesRow } from '@/lib/types';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  user_agent?: string;
  created_at?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

// Fallback padrão se não configurado
const DEFAULT_VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@dashify.com';

/**
 * Obtém ou inicializa as chaves VAPID criptográficas.
 * Dá prioridade a variáveis de ambiente, com fallback seguro no Supabase.
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  // 1. Variáveis de ambiente
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: DEFAULT_VAPID_SUBJECT,
    };
  }

  // 2. Banco de dados (app_settings)
  const supabase = getSupabaseAdmin();
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'vapid_keys')
      .single();

    if (data?.value?.publicKey && data?.value?.privateKey) {
      return {
        publicKey: data.value.publicKey,
        privateKey: data.value.privateKey,
        subject: data.value.subject || DEFAULT_VAPID_SUBJECT,
      };
    }
  } catch (e) {
    console.warn('Não foi possível ler chaves VAPID do Supabase:', e);
  }

  // 3. Auto-geração caso ainda não existam
  const generated = webpush.generateVAPIDKeys();
  const keys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: DEFAULT_VAPID_SUBJECT,
  };

  try {
    await supabase.from('app_settings').upsert({
      key: 'vapid_keys',
      value: keys,
    });
  } catch (err) {
    console.error('Erro ao salvar chaves VAPID geradas no Supabase:', err);
  }

  return keys;
}

/**
 * Retorna apenas a chave pública para o frontend realizar a inscrição
 */
export async function getVapidPublicKey(): Promise<string> {
  const keys = await getVapidKeys();
  return keys.publicKey;
}

/**
 * Configura o cliente web-push com as credenciais VAPID ativas
 */
async function configureWebPush(): Promise<boolean> {
  try {
    const keys = await getVapidKeys();
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    return true;
  } catch (error) {
    console.error('Falha ao configurar Web Push VAPID:', error);
    return false;
  }
}

/**
 * Salva ou atualiza a inscrição de um dispositivo (PC, celular, etc.)
 */
export async function savePushSubscription(
  subscription: { endpoint: string; keys: PushSubscriptionKeys },
  userAgent?: string
): Promise<boolean> {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Inscrição push inválida');
  }

  const supabase = getSupabaseAdmin();

  // Tenta salvar na tabela dedicada push_subscriptions
  try {
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (!error) return true;
  } catch {
    // Se a tabela não existir, faz fallback para app_settings
  }

  // Fallback: Armazena no app_settings (key: 'push_subscriptions')
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'push_subscriptions')
      .single();

    const list: StoredPushSubscription[] = Array.isArray(data?.value) ? data.value : [];
    const filtered = list.filter((item) => item.endpoint !== subscription.endpoint);
    filtered.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    });

    await supabase.from('app_settings').upsert({
      key: 'push_subscriptions',
      value: filtered,
    });

    return true;
  } catch (err: any) {
    console.error('Erro ao salvar push subscription no fallback app_settings:', err);
    throw err;
  }
}

/**
 * Remove a inscrição de um dispositivo (ex: quando o usuário desativa ou o token expira)
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  const supabase = getSupabaseAdmin();

  try {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch {}

  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'push_subscriptions')
      .single();

    if (Array.isArray(data?.value)) {
      const filtered = data.value.filter((item: any) => item.endpoint !== endpoint);
      await supabase.from('app_settings').upsert({
        key: 'push_subscriptions',
        value: filtered,
      });
    }
  } catch {}
}

/**
 * Recupera todas as inscrições ativas de dispositivos
 */
export async function getAllSubscriptions(): Promise<StoredPushSubscription[]> {
  const supabase = getSupabaseAdmin();

  // 1. Tenta da tabela dedicada
  try {
    const { data, error } = await supabase.from('push_subscriptions').select('*');
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
        user_agent: row.user_agent,
        created_at: row.created_at,
      }));
    }
  } catch {}

  // 2. Fallback da tabela app_settings
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'push_subscriptions')
      .single();

    if (Array.isArray(data?.value)) {
      return data.value;
    }
  } catch {}

  return [];
}

/**
 * Dispara uma notificação push para todos os dispositivos inscritos
 */
export async function sendPushToAll(payload: PushNotificationPayload): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  const isConfigured = await configureWebPush();
  if (!isConfigured) {
    console.warn('Web Push não pôde ser configurado. Notificação ignorada.');
    return { sent: 0, failed: 0, total: 0 };
  }

  const subscriptions = await getAllSubscriptions();
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const stringified = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard/vendas',
    tag: payload.tag || `dashify-${Date.now()}`,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
  });

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          stringified
        );
        sent++;
      } catch (err: any) {
        failed++;
        // Se a inscrição expirou (410 Gone ou 404 Not Found), remove automaticamente
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removePushSubscription(sub.endpoint);
        } else {
          console.warn(`Erro ao enviar push para ${sub.endpoint.slice(0, 30)}...:`, err.message);
        }
      }
    })
  );

  return { sent, failed, total: subscriptions.length };
}

/**
 * Formata o método de pagamento para exibição limpa
 */
function formatPaymentMethodName(raw?: string | null): string {
  if (!raw) return 'Cartão de crédito';
  const lower = raw.toLowerCase().trim();
  if (lower.includes('pix')) return 'Pix';
  if (lower.includes('boleto')) return 'Boleto';
  if (lower.includes('paypal')) return 'PayPal';
  if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('credit')) return 'Cartão de crédito';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Dispara notificação push de venda aprovada no formato exato solicitado:
 *
 * Título: Venda Realizada (Método de pagamento)
 * Corpo: Sua comissão: US$ Valor / R$ Valor
 */
export async function sendSalePushNotification(sale: SalesRow): Promise<void> {
  const paymentMethod = formatPaymentMethodName(sale.payment_method);
  const rawPayload = (sale.raw_payload as any) || {};

  const currency = (rawPayload.currency || 'USD').toUpperCase();
  const isUsd = currency === 'USD';
  const isBrl = currency === 'BRL';

  let currencySymbol = 'US$';
  let commissionValue = 0;

  if (isUsd) {
    currencySymbol = 'US$';
    commissionValue = Number(rawPayload.net_usd) || Number(rawPayload.raw_net_revenue) || 0;
    if (commissionValue <= 0 && rawPayload.fx_rate > 0) {
      commissionValue = (sale.net_revenue_brl || 0) / rawPayload.fx_rate;
    }
  } else if (isBrl) {
    currencySymbol = 'R$';
    commissionValue = sale.net_revenue_brl || 0;
  } else {
    // Moedas internacionais como EUR, ARS, etc.
    currencySymbol = currency === 'EUR' ? '€' : 'US$';
    commissionValue = Number(rawPayload.net_usd) || Number(rawPayload.raw_net_revenue) || 0;
    if (commissionValue <= 0 && rawPayload.fx_rate > 0) {
      commissionValue = (sale.net_revenue_brl || 0) / rawPayload.fx_rate;
    }
  }

  // Fallback se não calculou
  if (commissionValue <= 0) {
    commissionValue = sale.net_revenue_brl || 0;
    if (isUsd) currencySymbol = 'US$';
  }

  const formattedAmount = commissionValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const title = `Venda Realizada (${paymentMethod})`;
  const productName = sale.product_name ? `\nProduto: ${sale.product_name}` : '';
  const body = `Sua comissão: ${currencySymbol} ${formattedAmount}${productName}`;

  await sendPushToAll({
    title,
    body,
    url: '/dashboard/vendas',
    tag: `sale-${sale.code || Date.now()}`,
  });
}
