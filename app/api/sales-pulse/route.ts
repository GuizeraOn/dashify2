import { NextResponse } from 'next/server';
import { getSheetsClient, getSpreadsheetId } from '@/lib/sheets';

/**
 * Assinatura da planilha de vendas.
 *
 * Serve para o dashboard saber que chegou informacao nova sem ficar
 * recarregando tudo por precaucao: o cliente compara a assinatura a cada
 * consulta e so recarrega quando ela muda.
 *
 * A assinatura cobre a planilha inteira, nao so a contagem de linhas. Venda
 * que muda de "Aguardando" para "Aprovado" nao cria linha nova, mas muda todos
 * os numeros do painel — e e justamente o tipo de novidade que interessa.
 */

/**
 * FNV-1a de 32 bits. Nao precisa ser criptografico: so precisa mudar quando o
 * conteudo muda, e ser barato o bastante para rodar a cada consulta.
 */
function fingerprint(rows: unknown[][]): string {
  const text = rows.map((row) => row.join('')).join('');

  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export async function GET() {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'db_vendas!A:W',
    });

    const rows = response.data.values || [];

    return NextResponse.json({
      // Desconta o cabecalho.
      rows: Math.max(rows.length - 1, 0),
      signature: fingerprint(rows),
    });
  } catch (error: any) {
    console.error('Sales pulse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
