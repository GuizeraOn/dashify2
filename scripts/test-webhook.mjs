import { parsePerfectPayPayload, mapStatus, mapPaymentMethod, calculateNetRevenue, normalizeCountry } from '../lib/parsers/perfectpay.ts';

console.log('🧪 Iniciando testes unitários do Webhook e Parser da Perfect Pay...\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Teste de Normalização de Países
console.log('1. Testando normalização de países...');
assert(normalizeCountry('BR') === 'Brasil', 'Código "BR" normaliza para "Brasil"');
assert(normalizeCountry('US') === 'Estados Unidos', 'Código "US" normaliza para "Estados Unidos"');
assert(normalizeCountry('argentina') === 'Argentina', '"argentina" normaliza para "Argentina"');
assert(normalizeCountry(null) === 'Brasil', 'País nulo tem fallback para "Brasil"');

// 2. Teste de Mapeamento de Status
console.log('\n2. Testando mapeamento de status...');
assert(mapStatus(1) === 'aguardando', 'Status 1 (pending) mapeia para "aguardando"');
assert(mapStatus(2) === 'aprovado', 'Status 2 (approved) mapeia para "aprovado"');
assert(mapStatus(8) === 'aprovado', 'Status 8 (authorized) mapeia para "aprovado"');
assert(mapStatus(10) === 'aprovado', 'Status 10 (completed) mapeia para "aprovado"');
assert(mapStatus(6) === 'cancelado', 'Status 6 (cancelled) mapeia para "cancelado"');
assert(mapStatus(7) === 'reembolsado', 'Status 7 (refunded) mapeia para "reembolsado"');
assert(mapStatus(9) === 'estornado', 'Status 9 (charged_back) mapeia para "estornado"');
assert(mapStatus(5) === 'recusado', 'Status 5 (rejected) mapeia para "recusado"');

// 3. Teste de Cálculo de Faturamento Líquido (Comissões)
console.log('\n3. Testando cálculo de comissões e receita líquida...');
const commWithProducer = [
  { affiliation_type_enum: 1, name: 'Produtor', commission_amount: 331.28 },
  { affiliation_type_enum: 0, name: 'PerfectPay', commission_amount: 53.72 }
];
assert(
  calculateNetRevenue(385, commWithProducer) === 331.28,
  'Extrai comissão exata do produtor (tipo 1)'
);

const commWithoutProducer = [
  { affiliation_type_enum: 0, name: 'PerfectPay', commission_amount: 30.00 },
  { affiliation_type_enum: 5, name: 'Afiliado', commission_amount: 70.00 }
];
assert(
  calculateNetRevenue(200, commWithoutProducer) === 100.00,
  'Deduz taxa de plataforma (0) e afiliado (5) quando produtor não listado'
);

// 4. Teste de Parsing de Payload Completo (End-to-End)
console.log('\n4. Testando parsing de payload completo da Perfect Pay...');
const samplePayload = {
  token: 'test_token',
  code: 'PPCPMTB58MNF4E',
  sale_amount: 385,
  currency_enum: 1,
  installments: 12,
  payment_method_enum: 4,
  payment_type_enum: 1,
  sale_status_enum: 2,
  sale_status_detail: 'checkout_saved',
  date_created: '2019-03-09 08:24:02',
  date_approved: '2019-03-09 08:25:00',
  product: {
    code: 'PPPB3A07',
    name: 'Herus Caps',
    external_reference: '42433',
    guarantee: 30
  },
  plan: {
    code: 'PPLQQ9Q9R',
    name: 'Herus Caps | 3 potes',
    quantity: 5
  },
  customer: {
    customer_type_enum: 1,
    full_name: 'USER EXAMPLE',
    email: 'user_example@hotmail.com',
    identification_number: '57856874587',
    phone_area_code: '47',
    phone_number: '9965568558',
    state: 'RJ',
    city: 'Rio de Janeiro',
    country: 'BR'
  },
  metadata: {
    src: 'src_test',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'campanha_herus',
    utm_term: 'conjunto_1',
    utm_content: 'ad_video_3'
  },
  commission: [
    { affiliation_type_enum: 1, name: 'Produtor', commission_amount: 331.28 },
    { affiliation_type_enum: 0, name: 'PerfectPay', commission_amount: 53.72 }
  ]
};

const parsed = parsePerfectPayPayload(samplePayload);
assert(parsed.code === 'PPCPMTB58MNF4E', 'Código da venda capturado');
assert(parsed.status === 'aprovado', 'Status normalizado para "aprovado"');
assert(parsed.gross_revenue_brl === 385, 'Faturamento bruto é R$ 385,00');
assert(parsed.net_revenue_brl === 331.28, 'Faturamento líquido é R$ 331,28');
assert(parsed.product_code === 'PPPB3A07', 'Código do produto capturado');
assert(parsed.product_name === 'Herus Caps', 'Nome do produto capturado');
assert(parsed.country === 'Brasil', 'País normalizado para "Brasil"');
assert(parsed.customer_phone === '479965568558', 'Telefone concatenado sem formatação');
assert(parsed.utm_source === 'facebook', 'UTM Source capturado');
assert(parsed.utm_campaign === 'campanha_herus', 'UTM Campaign capturado');
assert(parsed.utm_content === 'ad_video_3', 'UTM Content capturado');
assert(parsed.utm_term === 'conjunto_1', 'UTM Term capturado');
assert(parsed.raw_payload !== null && typeof parsed.raw_payload === 'object', 'JSON bruto preservado');

console.log(`\n========================================`);
console.log(`Testes finalizados: ${passed} passaram, ${failed} falharam.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Todos os testes passaram com sucesso!');
}
