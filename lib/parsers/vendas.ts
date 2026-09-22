import type { VendasRow } from '../types';

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

  /**
   * A planilha devolve valores ja formatados: "R$ 91,70", "$17,94",
   * "R$ 310.901,66". A versao anterior trocava apenas a primeira virgula por
   * ponto, entao "R$ 1.234,56" virava "1.234.56" e o parseFloat parava no
   * primeiro ponto: R$ 1.234,56 era lido como 1,23. Qualquer venda de quatro
   * digitos para cima entrava no painel dividida por mil.
   */
  const parseFloatSafe = (val: any) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

    // Fora simbolo de moeda, espaco e qualquer letra.
    let str = String(val).replace(/[^\d,.-]/g, '');

    // Havendo virgula, o formato e pt-BR: ponto separa milhar, virgula decimal.
    // Sem virgula, o ponto ja e o separador decimal.
    if (str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    }

    const num = parseFloat(str);
    return Number.isFinite(num) ? num : 0;
  };

  /**
   * Procura a coluna pelo nome do cabecalho. `fallbackIndex` cobre colunas que
   * o script de captura ja preenche mas que ainda nao ganharam titulo na
   * linha 1 — caso das colunas de UTM.
   */
  const getValue = (row: any[], keys: string[], fallbackIndex?: number) => {
    for (const key of keys) {
      if (headerMap[key] !== undefined) {
        return row[headerMap[key]];
      }
    }
    if (fallbackIndex !== undefined && row.length > fallbackIndex) {
      return row[fallbackIndex];
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
      // A planilha nomeia estas colunas como "Faturamento Bruto (USD)". Os
      // apelidos antigos ('valor bruto usd') nunca casavam, entao os dois
      // campos chegavam sempre zerados.
      gross_value_usd: parseFloatSafe(
        getValue(row, ['faturamento bruto (usd)', 'faturamento bruto (moeda original)', 'valor bruto usd'])
      ),
      net_value_usd: parseFloatSafe(
        getValue(row, ['faturamento líquido (usd)', 'faturamento líquido (moeda original)', 'valor líquido usd'])
      ),
      gross_revenue_brl: parseFloatSafe(getValue(row, ['faturamento bruto r$'])),
      net_revenue_brl: parseFloatSafe(getValue(row, ['faturamento líquido r$'])),
      country: normalizeCountry(String(getValue(row, ['país', 'country']))),
      payment_method: String(getValue(row, ['meio de pagamento', 'payment method'])).toLowerCase().trim(),
      status: String(getValue(row, ['status'])),
      utm_source: String(getValue(row, ['utm_source', 'origem / utm', 'origem principal (source/src)'], 15)),
      utm_campaign: String(getValue(row, ['utm campaign', 'utm_campaign'], 19)),
      utm_medium: String(getValue(row, ['utm medium', 'utm_medium'], 20)),
      utm_content: String(getValue(row, ['utm content', 'utm_content'], 21)),
      utm_term: String(getValue(row, ['utm term', 'utm_term'], 22)),
      phone: phone,
    };
  });
}
