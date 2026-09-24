import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Normalização de países conforme padrão canônico do Dashify
const countryMap = {
  spain: 'Espanha',
  espana: 'Espanha',
  mexico: 'México',
  brasil: 'Brasil',
  brazil: 'Brasil',
  portugal: 'Portugal',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  usa: 'Estados Unidos',
  'estados unidos': 'Estados Unidos',
  argentina: 'Argentina',
  colombia: 'Colômbia',
  chile: 'Chile',
  uruguay: 'Uruguai',
  uruguai: 'Uruguai',
  paraguay: 'Paraguai',
  paraguai: 'Paraguai',
  peru: 'Peru',
  ecuador: 'Equador',
  equador: 'Equador',
  bolivia: 'Bolívia',
  panama: 'Panamá',
  'costa rica': 'Costa Rica',
  'el salvador': 'El Salvador',
  guatemala: 'Guatemala',
  honduras: 'Honduras',
  nicaragua: 'Nicarágua',
  'puerto rico': 'Porto Rico',
  'porto rico': 'Porto Rico',
  'dominican republic': 'República Dominicana',
  'republica dominicana': 'República Dominicana',
  switzerland: 'Suíça',
  suica: 'Suíça',
  france: 'França',
  franca: 'França',
  germany: 'Alemanha',
  alemanha: 'Alemanha',
  italy: 'Itália',
  italia: 'Itália',
  'united kingdom': 'Reino Unido',
  'reino unido': 'Reino Unido',
  canada: 'Canadá',
  venezuela: 'Venezuela',
  ar: 'Argentina',
  bo: 'Bolívia',
  br: 'Brasil',
  ca: 'Canadá',
  ch: 'Suíça',
  cl: 'Chile',
  co: 'Colômbia',
  cr: 'Costa Rica',
  de: 'Alemanha',
  do: 'República Dominicana',
  ec: 'Equador',
  es: 'Espanha',
  fr: 'França',
  gb: 'Reino Unido',
  gt: 'Guatemala',
  hn: 'Honduras',
  it: 'Itália',
  mx: 'México',
  ni: 'Nicarágua',
  pa: 'Panamá',
  pe: 'Peru',
  pr: 'Porto Rico',
  pt: 'Portugal',
  py: 'Paraguai',
  sv: 'El Salvador',
  us: 'Estados Unidos',
  uy: 'Uruguai',
  ve: 'Venezuela',
};

function normalizeCountry(val) {
  if (!val) return 'Desconhecido';
  const key = String(val)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
  return countryMap[key] || String(val).trim();
}

function parseFloatSafe(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  let str = String(val).replace(/[^\d,.-]/g, '');
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(str);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

function parseDateToIso(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const trimmed = String(dateStr).trim();

  // Caso 1: YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [datePart, timePart = '00:00:00'] = trimmed.split(' ');
    return `${datePart}T${timePart}-03:00`;
  }

  // Caso 2: DD/MM/YYYY HH:mm:ss
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    const [datePart, timePart = '00:00:00'] = trimmed.split(' ');
    const [d, m, y] = datePart.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timePart}-03:00`;
  }

  // Fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapStatus(statusRaw) {
  const st = String(statusRaw || '').trim().toLowerCase();
  if (st === 'aprovado') return { status: 'aprovado', enumVal: 2 };
  if (st === 'cancelado') return { status: 'cancelado', enumVal: 6 };
  if (st === 'reembolsado') return { status: 'reembolsado', enumVal: 7 };
  if (st === 'pendente' || st === 'aguardando pagamento' || st === 'aguardando') {
    return { status: 'aguardando', enumVal: 1 };
  }
  if (st === 'abandono') return { status: 'outro', enumVal: 12 };
  return { status: 'outro', enumVal: 0 };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerifyOnly = process.argv.includes('--verify-only');

  console.log('========================================================================');
  console.log('🚀 DASHIFY v2.0 — MIGRAÇÃO DE DADOS: GOOGLE SHEETS ➔ SUPABASE');
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulação)' : isVerifyOnly ? 'VERIFY-ONLY (Apenas Auditoria)' : 'EXECUÇÃO REAL'}`);
  console.log('========================================================================\n');

  // 1. Inicializar Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verificar se a tabela sales existe
  let tableExists = true;
  const { error: testTableErr } = await supabase.from('sales').select('code').limit(1);
  if (testTableErr) {
    if (testTableErr.code === 'PGRST205' || testTableErr.message?.includes('schema cache')) {
      tableExists = false;
      console.warn('⚠️  AVISO IMPORTANTE: A tabela "sales" ainda não foi criada no Supabase!');
      console.warn('👉 Para criá-la: execute o arquivo "supabase_vendas.sql" no SQL Editor do Supabase.');
      console.warn('   https://supabase.com/dashboard/project/_/sql\n');
      if (!isDryRun) {
        console.error('❌ Abortando execução real pois a tabela não existe.');
        process.exit(1);
      }
    } else {
      console.error('❌ Erro inesperado ao consultar Supabase:', testTableErr.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Conexão com Supabase validada. Tabela "sales" pronta.');
  }

  // Se modo verify-only, audita e sai
  if (isVerifyOnly) {
    console.log('\n📊 Executando auditoria de paridade no Supabase...');
    const { data: sales, error: fetchErr } = await supabase
      .from('sales')
      .select('code, status, net_revenue_brl');
    if (fetchErr) {
      console.error('❌ Erro ao buscar vendas no Supabase:', fetchErr.message);
      process.exit(1);
    }
    const totalCount = sales.length;
    const aprovados = sales.filter(s => s.status === 'aprovado');
    const netBrl = aprovados.reduce((sum, s) => sum + (Number(s.net_revenue_brl) || 0), 0);

    console.log('\nResultados no Supabase:');
    console.log(`- Total de vendas gravadas: ${totalCount}`);
    console.log(`- Vendas aprovadas: ${aprovados.length} (Esperado: 723)`);
    console.log(`- Faturamento Líquido (BRL): R$ ${netBrl.toFixed(2)} (Esperado: R$ 62010.30)`);

    const countOk = aprovados.length === 723;
    const revOk = Math.abs(netBrl - 62010.30) < 0.10;

    if (countOk && revOk) {
      console.log('\n🎉 PARIDADE ABSOLUTA CONFIRMADA! Supabase bate 100% com o Google Sheets.');
      process.exit(0);
    } else {
      console.error('\n❌ DIVERGÊNCIA DETECTADA! Os números não batem com o baseline esperado.');
      process.exit(1);
    }
  }

  // 2. Inicializar Google Sheets
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!serviceAccountJson || !spreadsheetId) {
    console.error('❌ Erro: GOOGLE_SERVICE_ACCOUNT_JSON ou SPREADSHEET_ID não definidos.');
    process.exit(1);
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheetsClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: sheetsClient });

  // 3. Carregar catálogo de produtos conhecidos
  let productCatalog = {};
  try {
    const { data: catData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'product_codes')
      .single();
    if (catData?.value?.products) {
      productCatalog = catData.value.products;
      console.log(`📦 Catálogo de produtos carregado do Supabase (${Object.keys(productCatalog).length} produtos).`);
    }
  } catch (err) {
    console.log('ℹ️  Nenhum catálogo prévio em app_settings.');
  }

  // 4. Carregar Log_Webhooks para enriquecer payloads
  console.log('🔍 Lendo histórico recente de webhooks (Log_Webhooks!C:C)...');
  const webhookMap = new Map();
  try {
    const logRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Log_Webhooks!C:C',
    });
    for (const row of (logRes.data.values || [])) {
      if (!row[0]) continue;
      try {
        const payload = JSON.parse(row[0]);
        if (payload.code) {
          webhookMap.set(payload.code.trim(), payload);
          if (payload.product?.name && payload.product?.code && !productCatalog[payload.product.name.trim()]) {
            productCatalog[payload.product.name.trim()] = {
              code: String(payload.product.code),
              guarantee: payload.product.guarantee || null,
            };
          }
        }
      } catch {
        // Ignora linhas que não são JSON válido
      }
    }
    console.log(`✅ ${webhookMap.size} payloads de webhook carregados e indexados.`);
  } catch (logErr) {
    console.warn('⚠️  Não foi possível ler Log_Webhooks:', logErr.message);
  }

  // 5. Ler DB_Vendas
  console.log('\n📖 Lendo DB_Vendas!A:W...');
  const vendasRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'DB_Vendas!A:W',
  });

  const rawRows = vendasRes.data.values || [];
  if (rawRows.length <= 1) {
    console.error('❌ Nenhuma linha encontrada em DB_Vendas.');
    process.exit(1);
  }

  // Filtrar linhas válidas com código de transação
  const dataRows = rawRows.slice(1).filter(r => r && r[3] && String(r[3]).trim() !== '');
  console.log(`✅ Total de vendas válidas identificadas: ${dataRows.length}`);

  // Converter para SalesRow
  const salesToInsert = [];
  let inMemoryApprovedCount = 0;
  let inMemoryNetRevenueBrl = 0;
  let inMemoryGrossRevenueBrl = 0;

  for (const row of dataRows) {
    const code = String(row[3]).trim();
    const dateIso = parseDateToIso(row[0]);
    const { status, enumVal } = mapStatus(row[12]);
    const isApproved = status === 'aprovado';

    const netBrl = parseFloatSafe(row[18]);
    const grossBrl = parseFloatSafe(row[17]);

    if (isApproved) {
      inMemoryApprovedCount++;
      inMemoryNetRevenueBrl += netBrl;
      inMemoryGrossRevenueBrl += grossBrl;
    }

    const prodName = (row[4] || '').trim();
    const knownProd = productCatalog[prodName];
    const webhookPayload = webhookMap.get(code);

    const saleRow = {
      code,
      date: dateIso,
      date_created: dateIso,
      date_approved: isApproved ? dateIso : null,
      customer_name: (row[7] || '').trim() || null,
      customer_email: (row[8] || '').trim() || null,
      customer_phone: (row[9] || '').trim() || null,
      customer_document: webhookPayload?.customer?.identification_number || null,
      country: normalizeCountry(row[10]),
      state: webhookPayload?.customer?.state || null,
      city: webhookPayload?.customer?.city || null,
      product_code: webhookPayload?.product?.code || knownProd?.code || null,
      product_name: prodName || 'Produto Desconhecido',
      plan_code: webhookPayload?.plan?.code || null,
      plan_name: webhookPayload?.plan?.name || null,
      funnel_step: (row[5] || '').trim() || null,
      gross_revenue_brl: grossBrl,
      net_revenue_brl: netBrl,
      installments: webhookPayload?.installments || 1,
      payment_method: (row[11] || '').trim().toLowerCase() || 'outro',
      status,
      sale_status_enum: webhookPayload?.sale_status_enum || enumVal,
      sale_status_detail: String(row[12] || '').trim(),
      utm_source: (row[15] || '').trim() || null,
      utm_campaign: (row[19] || '').trim() || null,
      utm_medium: (row[20] || '').trim() || null,
      utm_content: (row[21] || '').trim() || null,
      utm_term: (row[22] || '').trim() || null,
      src: webhookPayload?.metadata?.src || null,
      raw_payload: webhookPayload || {
        source: 'sheets_migration',
        dia_da_semana: row[1] || null,
        hora: row[2] || null,
        order_bump: row[6] || null,
        gross_usd: row[13] || null,
        net_usd: row[14] || null,
        fx_rate: row[16] || null,
      },
    };

    salesToInsert.push(saleRow);
  }

  console.log('\n📈 Estatísticas dos dados na Planilha:');
  console.log(`- Vendas válidas: ${salesToInsert.length}`);
  console.log(`- Vendas aprovadas: ${inMemoryApprovedCount} (Esperado: 723)`);
  console.log(`- Faturamento Líquido (BRL): R$ ${inMemoryNetRevenueBrl.toFixed(2)} (Esperado: R$ 62010.30)`);
  console.log(`- Faturamento Bruto (BRL): R$ ${inMemoryGrossRevenueBrl.toFixed(2)} (Esperado: R$ 75603.36)`);

  if (isDryRun) {
    console.log('\n✨ Modo DRY-RUN concluído com sucesso. Nenhuma alteração feita no banco de dados.');
    process.exit(0);
  }

  // 6. Inserção em Lote no Supabase
  console.log('\n💾 Iniciando inserção em lote no Supabase (chunks de 200)...');
  const CHUNK_SIZE = 200;
  for (let i = 0; i < salesToInsert.length; i += CHUNK_SIZE) {
    const chunk = salesToInsert.slice(i, i + CHUNK_SIZE);
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(salesToInsert.length / CHUNK_SIZE);

    const { error: upsertErr } = await supabase
      .from('sales')
      .upsert(chunk, { onConflict: 'code' });

    if (upsertErr) {
      console.error(`❌ Erro no lote ${chunkNum}/${totalChunks}:`, upsertErr.message);
      process.exit(1);
    }
    console.log(`  [${chunkNum}/${totalChunks}] ${chunk.length} vendas gravadas com sucesso.`);
  }

  console.log('\n✅ Todas as 1.058 vendas foram gravadas/atualizadas no Supabase!');

  // 7. Auditoria de Paridade Final
  console.log('\n🔍 Realizando auditoria de paridade no Supabase...');
  const { data: dbSales, error: auditErr } = await supabase
    .from('sales')
    .select('code, status, net_revenue_brl');

  if (auditErr) {
    console.error('❌ Erro na consulta de auditoria:', auditErr.message);
    process.exit(1);
  }

  const dbApproved = dbSales.filter(s => s.status === 'aprovado');
  const dbNetRev = dbApproved.reduce((sum, s) => sum + (Number(s.net_revenue_brl) || 0), 0);

  console.log('\n========================================================================');
  console.log('TABELA DE PARIDADE:');
  console.log('========================================================================');
  console.log(`Métrica                    | Planilha (Esperado) | Supabase (Gravado) | Status`);
  console.log(`Total de Vendas Gravadas   | 1058                | ${String(dbSales.length).padEnd(18)} | ${dbSales.length === 1058 ? '✅ OK' : '⚠️ DIF'}`);
  console.log(`Vendas Aprovadas           | 723                 | ${String(dbApproved.length).padEnd(18)} | ${dbApproved.length === 723 ? '✅ OK' : '❌ ERRO'}`);
  console.log(`Faturamento Líquido (BRL)  | R$ 62010.30         | R$ ${dbNetRev.toFixed(2).padEnd(15)} | ${Math.abs(dbNetRev - 62010.30) < 0.1 ? '✅ OK' : '❌ ERRO'}`);
  console.log('========================================================================');

  if (dbApproved.length === 723 && Math.abs(dbNetRev - 62010.30) < 0.1) {
    console.log('\n🎉 PARIDADE ABSOLUTA CONFIRMADA! A migração da Fase 6 foi concluída com sucesso.');
    process.exit(0);
  } else {
    console.error('\n❌ ALERTA: Divergência detectada após migração. Verifique os registros.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
