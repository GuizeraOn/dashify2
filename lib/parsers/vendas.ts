import { VendasRow } from '../types';

/**
 * Nome canonico de cada pais, em portugues.
 *
 * A planilha recebe o mesmo pais escrito de varias formas — "Uruguay" e
 * "Uruguai", "Switzerland" e "Suica" — e sem canonizar cada grafia vira uma
 * linha separada no ranking, partindo o faturamento do pais em dois.
 *
 * As chaves sao comparadas sem acento e em caixa baixa (ver normalizeCountry),
 * entao basta uma entrada por grafia, nao por acentuacao.
 */
const countryMap: Record<string, string> = {
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
};

export function parseVendas(rows: any[][]): VendasRow[] {
  if (!rows || rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).toLowerCase().trim());
  
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    headerMap[h] = i;
  });

  const parseFloatSafe = (val: any) => {
    if (!val) return 0;
    // Remove R$, $, spaces, and replace comma with dot
    let str = String(val).replace(/[R\$\s]/gi, '');
    str = str.replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const getValue = (row: any[], keys: string[]) => {
    for (const key of keys) {
      if (headerMap[key] !== undefined) {
        return row[headerMap[key]];
      }
    }
    return '';
  };

  const normalizeCountry = (val: string) => {
    if (!val) return 'Desconhecido';
    // Sem acento e em caixa baixa: "Bolívia" e "Bolivia" caem na mesma chave.
    const key = val
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
    return countryMap[key] || val.trim();
  };

  return rows.slice(1).map((row, index) => {
    // Treat 'Telefone' as strict string
    const phoneVal = getValue(row, ['telefone', 'phone']);
    const phone = phoneVal !== undefined && phoneVal !== null ? String(phoneVal) : '';

    return {
      key: String(getValue(row, ['key', 'id']) || `vendas_${index}`),
      date: String(getValue(row, ['data / hora', 'data', 'date'])),
      cliente: String(getValue(row, ['cliente', 'customer'])),
      produto: String(getValue(row, ['produto', 'product'])),
      funnel_step: String(getValue(row, ['etapa do funil', 'funnel'])),
      gross_value_usd: parseFloatSafe(getValue(row, ['valor bruto usd'])),
      net_value_usd: parseFloatSafe(getValue(row, ['valor líquido usd'])),
      gross_revenue_brl: parseFloatSafe(getValue(row, ['faturamento bruto r$'])),
      net_revenue_brl: parseFloatSafe(getValue(row, ['faturamento líquido r$'])),
      country: normalizeCountry(String(getValue(row, ['país', 'country']))),
      payment_method: String(getValue(row, ['meio de pagamento', 'payment method'])).toLowerCase().trim(),
      status: String(getValue(row, ['status'])),
      utm_source: String(getValue(row, ['origem / utm', 'utm_source'])),
      phone: phone,
    };
  });
}
