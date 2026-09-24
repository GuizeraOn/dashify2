import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('========================================================================');
console.log('🧪 TESTE DE INTEGRAÇÃO DAS ROTAS ANALÍTICAS (SUPABASE)');
console.log('========================================================================\n');

// 1. Testar Sales Pulse
console.log('1. Testando Sales Pulse (Performance & Assinatura)...');
const t0Pulse = performance.now();
const [countRes, latestRes] = await Promise.all([
  supabase.from('sales').select('*', { count: 'exact', head: true }),
  supabase.from('sales').select('code, updated_at, status').order('updated_at', { ascending: false }).limit(1),
]);
const pulseDuration = performance.now() - t0Pulse;
console.log(`  ⏱️ Tempo de resposta: ${pulseDuration.toFixed(1)}ms`);
console.log(`  📊 Vendas registradas: ${countRes.count}`);
console.log(`  🕒 Última atualização: ${latestRes.data?.[0]?.updated_at}`);

if (pulseDuration > 100) {
  console.warn('  ⚠️ Aviso: Pulse demorou mais de 100ms');
} else {
  console.log('  ✅ Pulse ultrarrápido (< 100ms)');
}

// 2. Testar Consulta Geral de Vendas
console.log('\n2. Testando Consulta Paginada de Vendas...');
const t0Fetch = performance.now();
const PAGE_SIZE = 1000;
let allSales = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .from('sales')
    .select('code, date, product_name, status, net_revenue_brl, gross_revenue_brl, country, payment_method, utm_campaign')
    .order('date', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  allSales.push(...(data || []));
  if (!data || data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}
const fetchDuration = performance.now() - t0Fetch;
console.log(`  ⏱️ Tempo para carregar ${allSales.length} vendas: ${fetchDuration.toFixed(1)}ms`);

const approved = allSales.filter(s => s.status === 'aprovado');
const totalNet = approved.reduce((sum, s) => sum + (Number(s.net_revenue_brl) || 0), 0);
console.log(`  ✅ Total de vendas aprovadas: ${approved.length} (Esperado: 723)`);
console.log(`  ✅ Receita líquida total: R$ ${totalNet.toFixed(2)} (Esperado: R$ 62010.30)`);

if (approved.length !== 723 || Math.abs(totalNet - 62010.30) > 0.1) {
  console.error('  ❌ Erro de integridade nos totais!');
  process.exit(1);
}

// 3. Testar Agregações de Relatórios (Heatmap & Produtos)
console.log('\n3. Testando Agregações de Produtos e Funil...');
const productMap = {};
approved.forEach(s => {
  const p = s.product_name || 'Desconhecido';
  if (!productMap[p]) productMap[p] = { count: 0, revenue: 0 };
  productMap[p].count++;
  productMap[p].revenue += Number(s.net_revenue_brl) || 0;
});

console.log('  Produtos encontrados no Supabase:');
Object.entries(productMap).forEach(([name, data]) => {
  console.log(`   - "${name}": ${data.count} vendas | R$ ${data.revenue.toFixed(2)}`);
});

// 4. Testar Filtro de Data
console.log('\n4. Testando Filtro Temporal (Mês Atual)...');
const { data: monthSales } = await supabase
  .from('sales')
  .select('code, net_revenue_brl')
  .gte('date', '2026-09-01T00:00:00-03:00')
  .lte('date', '2026-09-30T23:59:59-03:00');

console.log(`  ✅ Vendas no intervalo de setembro/2026: ${monthSales?.length || 0}`);

console.log('\n========================================================================');
console.log('🎉 TODOS OS TESTES DAS ROTAS ANALÍTICAS PASSARAM COM SUCESSO!');
console.log('========================================================================');
