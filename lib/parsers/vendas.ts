import { VendasRow } from '../types';

const countryMap: Record<string, string> = {
  "spain": "Espanha",
  "espana": "Espanha",
  "españa": "Espanha",
  "mexico": "México",
  "brasil": "Brasil",
  "brazil": "Brasil",
  "portugal": "Portugal",
  "united states": "Estados Unidos",
  "usa": "Estados Unidos",
  "argentina": "Argentina",
  "colombia": "Colômbia",
  "chile": "Chile",
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
    const lower = val.toLowerCase().trim();
    return countryMap[lower] || val.trim();
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
