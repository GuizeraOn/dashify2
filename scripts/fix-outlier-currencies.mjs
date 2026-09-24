import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getRate(currency) {
  if (!currency || currency === 'BRL') return 1.0;
  try {
    const res = await fetch(`https://economia.awesomeapi.com.br/json/last/${currency}-BRL`);
    if (res.ok) {
      const data = await res.json();
      const bid = parseFloat(data?.[`${currency}BRL`]?.bid);
      if (!isNaN(bid) && bid > 0) return bid;
    }
  } catch {}
  const fallbacks = {
    ARS: 0.00342,
    COP: 0.00158,
    CLP: 0.00540,
    MXN: 0.293,
    USD: 5.20,
    EUR: 5.90,
  };
  return fallbacks[currency] || 1.0;
}

async function main() {
  console.log('🔍 Buscando vendas com valores distorcidos em moeda local (ARS, COP, CLP, MXN)...');
  
  // Buscar todas as vendas de hoje que possuem currency_paid ou net_revenue_brl > 500 sem ser aprovada alta
  const { data: sales, error } = await supabase
    .from('sales')
    .select('code, status, customer_name, gross_revenue_brl, net_revenue_brl, raw_payload')
    .gte('date', '2026-09-24T00:00:00-03:00');

  if (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }

  let fixed = 0;
  for (const s of (sales || [])) {
    const raw = s.raw_payload || {};
    const currencyPaid = raw.currency_paid ? String(raw.currency_paid).trim().toUpperCase() : null;
    
    // Se a moeda paga é ARS, COP, CLP, MXN, etc.
    if (currencyPaid && currencyPaid !== 'USD' && currencyPaid !== 'BRL') {
      const rate = await getRate(currencyPaid);
      const rawSaleAmount = typeof raw.sale_amount === 'number' 
        ? raw.sale_amount 
        : parseFloat(String(raw.sale_amount || '0').replace(',', '.')) || 0;

      let rawNet = rawSaleAmount;
      if (Array.isArray(raw.commission)) {
        const prodComm = raw.commission.find(c => c.affiliation_type_enum === 1);
        if (prodComm && typeof prodComm.commission_amount === 'number') {
          rawNet = prodComm.commission_amount;
        }
      }

      const correctedGross = Number((rawSaleAmount * rate).toFixed(2));
      const correctedNet = Number((rawNet * rate).toFixed(2));

      console.log(`Corrigindo ${s.code} (${s.customer_name}) | Moeda: ${currencyPaid} | Antes: R$ ${s.net_revenue_brl} | Novo: R$ ${correctedNet} (Taxa: ${rate})`);

      await supabase
        .from('sales')
        .update({
          gross_revenue_brl: correctedGross,
          net_revenue_brl: correctedNet,
          raw_payload: {
            ...raw,
            currency: currencyPaid,
            fx_rate: rate,
          }
        })
        .eq('code', s.code);

      fixed++;
    }
  }

  console.log(`\n🎉 Concluído: ${fixed} vendas em moeda local corrigidas com sucesso!`);
}

main().catch(console.error);
