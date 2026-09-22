import { getSupabaseAdmin } from '@/lib/supabase';
import { MetaRow } from '@/lib/types';

/**
 * Leitura da tabela de insights do Meta.
 *
 * Existe por causa de um limite silencioso: o PostgREST corta o resultado em
 * 1.000 linhas por consulta e nao avisa — a resposta chega sem erro, so
 * incompleta. Enquanto a sincronizacao era por campanha isso nunca apertava
 * (duas campanhas x 24 horas x 7 dias), mas no nivel de anuncio a mesma janela
 * passa de dois mil registros, e um corte ali apareceria como gasto a menos no
 * painel inteiro, sem nenhum sinal de que faltou dado.
 *
 * Por isso a leitura e paginada ate a ultima pagina vir curta.
 */
const PAGE_SIZE = 1000;
/** Teto de seguranca: 100 mil linhas ja e muito mais que qualquer janela real. */
const MAX_PAGES = 100;

/**
 * Uma linha da tabela. Alem do que o resumo ja usava, carrega a hierarquia
 * (campanha / conjunto / anuncio) que a coleta por anuncio passou a gravar.
 * Conjunto e anuncio sao nulos nas linhas antigas, de quando a consulta ao
 * Meta era so no nivel de campanha.
 */
export interface MetaInsightRow extends MetaRow {
  campaign_id: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  link_clicks: number;
  landing_page_views: number;
  initiate_checkout: number;
  leads: number;
  /** Colunas da migracao supabase_migration_colunas_meta.sql. */
  post_comments: number | null;
  video_3s_views: number | null;
  thruplays: number | null;
  currency: string | null;
  [key: string]: unknown;
}

export async function fetchMetaInsights(
  dateStart?: string,
  dateEnd?: string
): Promise<MetaInsightRow[]> {
  const rows: MetaInsightRow[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = getSupabaseAdmin()
      .from('meta_ads_insights')
      .select('*')
      // A ordem precisa ser estavel entre as paginas: sem ORDER BY o banco
      // pode devolver a mesma linha duas vezes e pular outra.
      .order('key', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (dateStart) query = query.gte('date', dateStart);
    if (dateEnd) query = query.lte('date', dateEnd);

    const { data, error } = await query;
    if (error) throw new Error('Supabase Error: ' + error.message);

    const batch = (data || []) as MetaInsightRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

/** Uma linha de alcance diario, ja deduplicado dentro do dia pelo Meta. */
export interface MetaReachRow {
  date: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  reach: number | null;
  frequency: number | null;
  impressions: number | null;
}

/**
 * Alcance e frequencia, da tabela a parte (ver syncDailyReach).
 *
 * Devolve vazio se a tabela ainda nao existe: a migracao e feita a mao, e ate
 * ela acontecer as duas colunas ficam em branco na tela em vez de derrubar a
 * pagina inteira.
 */
export async function fetchMetaDailyReach(
  dateStart?: string,
  dateEnd?: string
): Promise<MetaReachRow[]> {
  const rows: MetaReachRow[] = [];

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      let query = getSupabaseAdmin()
        .from('meta_ads_daily_reach')
        .select('*')
        .order('key', { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (dateStart) query = query.gte('date', dateStart);
      if (dateEnd) query = query.lte('date', dateEnd);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const batch = (data || []) as MetaReachRow[];
      rows.push(...batch);

      if (batch.length < PAGE_SIZE) break;
    }
  } catch (error: any) {
    console.error('Reach table unavailable:', error.message);
    return [];
  }

  return rows;
}
