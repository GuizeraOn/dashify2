import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔄 Buscando cotação USD/BRL atual...');
  const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
  const fxData = await res.json();
  const fxRate = parseFloat(fxData.USDBRL.bid) || 5.20;
  console.log(`💵 Taxa oficial USD/BRL: R$ ${fxRate.toFixed(4)}`);

  console.log('\n🔍 Buscando vendas de hoje para conversão...');
  const { data: sales, error } = await supabase
    .from('sales')
    .select('code, status, gross_revenue_brl, net_revenue_brl, raw_payload')
    .gte('date', '2026-09-24T00:00:00-03:00');

  if (error) {
    console.error('Erro ao buscar vendas:', error.message);
    process.exit(1);
  }

  let updatedCount = 0;
  let newNetApprovedSum = 0;
  let newGrossApprovedSum = 0;

  for (const sale of (sales || [])) {
    const raw = sale.raw_payload || {};
    const isUsd = raw.currency_enum === 2 || raw.currency_enum_key === 'USD';

    // Se a venda é em USD e os valores no banco estão em dólar puro (ex: < 50 BRL para ofertas comuns)
    // ou se não possui fx_rate gravado
    if (isUsd && (Number(sale.net_revenue_brl) < 50 || !raw.fx_rate)) {
      const saleAmountUsd = typeof raw.sale_amount === 'number' 
        ? raw.sale_amount 
        : parseFloat(String(raw.sale_amount || sale.gross_revenue_brl));

      // Comissão do produtor em USD
      let netUsd = sale.net_revenue_brl;
      if (Array.isArray(raw.commission)) {
        const prodComm = raw.commission.find(c => c.affiliation_type_enum === 1);
        if (prodComm && typeof prodComm.commission_amount === 'number') {
          netUsd = prodComm.commission_amount;
        }
      }

      const grossBrl = Number((saleAmountUsd * fxRate).toFixed(2));
      const netBrl = Number((netUsd * fxRate).toFixed(2));

      const updatedRawPayload = {
        ...raw,
        fx_rate: fxRate,
        gross_usd: saleAmountUsd,
        net_usd: netUsd,
      };

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          gross_revenue_brl: grossBrl,
          net_revenue_brl: netBrl,
          raw_payload: updatedRawPayload,
        })
        .eq('code', sale.code);

      if (updateError) {
        console.error(`Falha ao atualizar ${sale.code}:`, updateError.message);
      } else {
        updatedCount++;
        if (sale.status === 'aprovado') {
          newNetApprovedSum += netBrl;
          newGrossApprovedSum += grossBrl;
        }
      }
    } else if (sale.status === 'aprovado') {
      newNetApprovedSum += Number(sale.net_revenue_brl) || 0;
      newGrossApprovedSum += Number(sale.gross_revenue_brl) || 0;
    }
  }

  console.log(`\n✅ ${updatedCount} vendas convertidas de USD para BRL com sucesso!`);
  console.log(`📊 Novo Faturamento Líquido de Hoje: R$ ${newNetApprovedSum.toFixed(2)}`);
  console.log(`📊 Novo Faturamento Bruto de Hoje: R$ ${newGrossApprovedSum.toFixed(2)}`);
}

main().catch(console.error);
