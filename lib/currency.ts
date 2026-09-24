/**
 * Serviço de Cotação de Câmbio Multi-Moeda para BRL
 *
 * Consulta taxas comerciais oficiais na AwesomeAPI para conversão das vendas internacionais da Perfect Pay.
 * Suporta USD, EUR, GBP, ARS (Argentina), COP (Colômbia), CLP (Chile), MXN (México), etc.
 * Mantém cache em memória por 15 minutos para performance instantânea.
 */

const rateCache = new Map<string, { rate: number; expiresAt: number }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

const FALLBACK_RATES: Record<string, number> = {
  USD: 5.20,
  EUR: 5.90,
  GBP: 6.85,
  ARS: 0.00342,   // ~1 BRL = ~290 ARS
  COP: 0.00158,   // ~1 BRL = ~630 COP
  CLP: 0.00540,   // ~1 BRL = ~185 CLP
  MXN: 0.293,     // ~1 BRL = ~3.4 MXN
  BOB: 0.75,      // Boliviano
  PEN: 1.40,      // Sol Peruano
  UYU: 0.125,     // Peso Uruguaio
  PYG: 0.00065,   // Guarani Paraguaio
  BRL: 1.0,
};

/**
 * Retorna a taxa de conversão da moeda especificada para BRL.
 * Exemplo: se 1 USD = 5.20 BRL, retorna 5.20.
 * Exemplo: se 1 ARS = 0.00342 BRL, retorna 0.00342.
 */
export async function getExchangeRateToBrl(currency: string = 'USD'): Promise<number> {
  const curr = String(currency || '').trim().toUpperCase();
  if (!curr || curr === 'BRL') return 1.0;

  const now = Date.now();
  const cached = rateCache.get(curr);
  if (cached && cached.expiresAt > now) {
    return cached.rate;
  }

  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${curr}-BRL`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 900 }
    });

    if (res.ok) {
      const data = await res.json();
      const key = `${curr}BRL`;
      const bid = parseFloat(data?.[key]?.bid);
      if (!isNaN(bid) && bid > 0) {
        rateCache.set(curr, { rate: bid, expiresAt: now + CACHE_DURATION_MS });
        return bid;
      }
    }
  } catch (err: any) {
    console.warn(`Aviso: Falha ao consultar taxa ${curr}/BRL ao vivo:`, err?.message);
  }

  return rateCache.get(curr)?.rate || FALLBACK_RATES[curr] || 1.0;
}

/** Alias para compatibilidade */
export async function getUsdToBrlRate(): Promise<number> {
  return getExchangeRateToBrl('USD');
}
