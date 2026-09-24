/**
 * Serviço de Cotação de Câmbio (USD/BRL)
 *
 * Consulta a taxa comercial atual do Dólar para conversão das vendas internacionais da Perfect Pay.
 * Utiliza cache em memória para resposta instantânea e fallback seguro.
 */

let cachedRate: { rate: number; expiresAt: number } | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos
const FALLBACK_USD_RATE = 5.20;

export async function getUsdToBrlRate(): Promise<number> {
  const now = Date.now();
  if (cachedRate && cachedRate.expiresAt > now) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      headers: { Accept: 'application/json' },
      // Cache de 15 minutos na fetch API do Next.js
      next: { revalidate: 900 }
    });

    if (res.ok) {
      const data = await res.json();
      const bid = parseFloat(data?.USDBRL?.bid);
      if (!isNaN(bid) && bid > 0) {
        cachedRate = { rate: bid, expiresAt: now + CACHE_DURATION_MS };
        return bid;
      }
    }
  } catch (err: any) {
    console.warn('Aviso: Não foi possível obter taxa USD/BRL ao vivo, usando fallback:', err?.message);
  }

  return cachedRate?.rate || FALLBACK_USD_RATE;
}
