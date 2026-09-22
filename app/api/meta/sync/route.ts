import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { addDays, formatDay, startOfToday } from '@/lib/dates';

// Constants mimicking the Apps Script
const API_VERSION = 'v25.0';
/**
 * Nivel da consulta ao Meta.
 *
 * Em 'ad' cada linha ja vem com campanha, conjunto e anuncio juntos, entao a
 * mesma tabela alimenta os tres niveis da aba Campanhas — basta somar por uma
 * coluna ou por outra. O preco e o volume: o numero de linhas vira
 * anuncios x horas x dias, e nao mais campanhas x horas x dias.
 */
const LEVEL: string = 'ad';
const LOOKBACK_DAYS = 7;
const ROW_LIMIT = 500;
/**
 * Paginas por sincronizacao. Com ~2.000 linhas por janela no nivel de anuncio,
 * 500 por pagina, sobra folga. O limite existe so para nao girar para sempre
 * se o Meta devolver um cursor circular.
 */
const PAGE_GUARD = 60;

/**
 * A consulta era quebrada por hora. Deixou de ser, por dois motivos:
 *
 * 1. Ninguem lia a hora. A coluna existia na tabela, mas o unico mapa de calor
 *    do painel e montado a partir da planilha de vendas, nao daqui. O preco
 *    disso era 24 vezes mais linhas — 3.061 em vez de 128 — o que multiplicava
 *    as paginas pedidas ao Meta, o tamanho da gravacao e a leitura de toda
 *    consulta do painel.
 *
 * 2. O Meta nao devolve `video_thruplay_watched_actions` junto com essa quebra.
 *    Era por isso que o Hold Rate dava 0% em todos os anuncios.
 */

export async function POST() {
  try {
    const token = process.env.META_TOKEN;
    const account = process.env.AD_ACCOUNT_ID?.replace(/^act_/, '');

    if (!token || !account) {
      return NextResponse.json({ error: 'Missing META_TOKEN or AD_ACCOUNT_ID' }, { status: 400 });
    }

    // A janela usa o fuso do negocio — que e tambem o da conta de anuncios, ja
    // que o breakdown e por fuso do anunciante. Antes isto usava o fuso do
    // servidor: correto na maquina do desenvolvedor, UTC na Vercel.
    const today = startOfToday();
    const until = formatDay(today);
    const since = formatDay(addDays(today, -LOOKBACK_DAYS));

    const dimFields = ['account_id', 'account_name', 'account_currency', 'campaign_id', 'campaign_name'];
    if (LEVEL === 'adset' || LEVEL === 'ad') dimFields.push('adset_id', 'adset_name');
    if (LEVEL === 'ad') dimFields.push('ad_id', 'ad_name');
    
    const metricFields = [
      'spend', 'impressions', 'clicks', 'inline_link_clicks',
      'ctr', 'cpc', 'cpm', 'actions', 'action_values', 'purchase_roas', 'date_start',
      // Video: alimentam Hook Rate (3s / impressoes) e Hold Rate
      // (ThruPlays / impressoes).
      'video_play_actions', 'video_thruplay_watched_actions'
    ];
    
    const fields = dimFields.concat(metricFields).join(',');
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

    let url: string | null = `https://graph.facebook.com/${API_VERSION}/act_${account}/insights` +
      `?level=${LEVEL}&time_increment=1&time_range=${timeRange}` +
      `&fields=${fields}&limit=${ROW_LIMIT}&access_token=${encodeURIComponent(token)}`;

    // Carimbo unico da execucao: e ele que separa o que esta atualizado do que
    // sobrou de um formato antigo (ver a faxina depois da gravacao).
    const runStamp = new Date().toISOString();

    // Dispara ja: as consultas de alcance sao independentes do laco abaixo e
    // rodam enquanto ele pagina.
    const reachPromise = syncDailyReach({ token, account, since, until });

    const rowsToUpsert = [];
    let guard = 0;

    // Helpers
    const pickAction = (arr: any[], candidates: string[]) => {
      if (!Array.isArray(arr)) return 0;
      for (const type of candidates) {
        const hit = arr.find(a => a.action_type === type);
        if (hit) return Number(hit.value) || 0;
      }
      return 0;
    };

    while (url && guard < PAGE_GUARD) {
      guard++;
      const res: Response = await fetch(url);
      const data: any = await res.json();

      if (data.error) {
        throw new Error('Meta API Error: ' + data.error.message);
      }

      for (const r of (data.data || [])) {
        const purchases = pickAction(r.actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
        const purchaseValue = pickAction(r.action_values, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
        const leads = pickAction(r.actions, ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']);
        const initiateCk = pickAction(r.actions, ['initiate_checkout', 'omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']);
        const lpv = pickAction(r.actions, ['landing_page_view']);
        
        // "video_view" no array de actions e a reproducao de 3 segundos — e
        // dela que sai o Hook Rate.
        const video3s = pickAction(r.actions, ['video_view', 'omni_video_view']);
        const thruplays = pickAction(r.video_thruplay_watched_actions, ['video_view']);
        const postComments = pickAction(r.actions, ['comment', 'post_comment']);

        let roas = pickAction(r.purchase_roas, ['purchase', 'omni_purchase']);
        if (!roas && Number(r.spend)) roas = purchaseValue / Number(r.spend);

        const adsetId = (LEVEL === 'adset' || LEVEL === 'ad') ? r.adset_id : null;
        const adId = (LEVEL === 'ad') ? r.ad_id : null;

        const key = `${r.date_start}|${r.campaign_id}|${adsetId || ''}|${adId || ''}`;

        rowsToUpsert.push({
          key,
          date: r.date_start,
          hour: null,
          account_id: r.account_id,
          account_name: r.account_name,
          campaign_id: r.campaign_id,
          campaign_name: r.campaign_name,
          adset_id: adsetId,
          adset_name: r.adset_name || null,
          ad_id: adId,
          ad_name: r.ad_name || null,
          spend: Number(r.spend) || 0,
          impressions: Number(r.impressions) || 0,
          clicks: Number(r.clicks) || 0,
          link_clicks: Number(r.inline_link_clicks) || 0,
          ctr: Number(r.ctr) || 0,
          cpc: Number(r.cpc) || 0,
          cpm: Number(r.cpm) || 0,
          landing_page_views: lpv,
          initiate_checkout: initiateCk,
          purchases,
          purchase_value: purchaseValue,
          roas: roas,
          leads,
          post_comments: postComments,
          video_3s_views: video3s,
          thruplays,
          currency: r.account_currency,
          updated_at: runStamp
        });
      }

      url = (data.paging && data.paging.next) ? data.paging.next : null;
    }

    let purged = 0;

    // Fica falso quando o banco ainda nao passou pela migracao das colunas
    // novas; a resposta avisa, para o motivo de as metricas estarem vazias nao
    // virar misterio.
    let schemaComplete = true;

    if (rowsToUpsert.length > 0) {
      const NEW_COLUMNS = ['post_comments', 'video_3s_views', 'thruplays'];

      let { error } = await getSupabaseAdmin()
        .from('meta_ads_insights')
        .upsert(rowsToUpsert, { onConflict: 'key' });

      /**
       * Rede de seguranca para a ordem da publicacao.
       *
       * A Vercel publica sozinha a cada push, e a migracao do banco e feita a
       * mao — entao existe uma janela em que o codigo novo fala com a tabela
       * antiga. Sem isto, o upsert inteiro falharia e o painel pararia de
       * receber gasto por causa de tres colunas acessorias. Aqui ele regrava
       * sem elas e segue funcionando.
       */
      // O PostgREST responde "Could not find the 'x' column of 'y' in the
      // schema cache"; o Postgres cru diz 'column "x" does not exist'. Os dois
      // formatos aparecem dependendo de onde a consulta para.
      const isMissingColumn =
        /could not find the .* column/i.test(error?.message || '') ||
        /column .* does not exist/i.test(error?.message || '');

      if (error && isMissingColumn) {
        schemaComplete = false;

        const legacyRows = rowsToUpsert.map((row) => {
          const copy: Record<string, unknown> = { ...row };
          NEW_COLUMNS.forEach((column) => delete copy[column]);
          return copy;
        });

        ({ error } = await getSupabaseAdmin()
          .from('meta_ads_insights')
          .upsert(legacyRows, { onConflict: 'key' }));
      }

      if (error) {
        throw new Error('Supabase Upsert Error: ' + error.message);
      }

      /**
       * Faxina do que sobrou de formatos antigos.
       *
       * A chave ja mudou duas vezes: era `data|hora|campanha`, virou
       * `data|hora|campanha|conjunto|anuncio` e agora e
       * `data|campanha|conjunto|anuncio`. Chave diferente quer dizer que o
       * upsert nao substitui — as versoes antigas ficariam na tabela ao lado
       * das novas, e qualquer soma de gasto contaria o mesmo dinheiro duas ou
       * tres vezes.
       *
       * Em vez de perseguir cada formato, apaga o que nao foi tocado por esta
       * execucao: dentro da janela recem-gravada, o que tem carimbo anterior
       * ao desta rodada e sobra, por definicao.
       *
       * So roda se a paginacao terminou. Se o Meta ficou devendo pagina, o que
       * veio pode estar incompleto e o antigo ainda e a melhor informacao que
       * temos. Dias anteriores a janela ficam intactos.
       */
      if (!url) {
        const { count, error: purgeError } = await getSupabaseAdmin()
          .from('meta_ads_insights')
          .delete({ count: 'exact' })
          .gte('date', since)
          .lte('date', until)
          .or(`updated_at.is.null,updated_at.lt.${runStamp}`);

        if (purgeError) {
          throw new Error('Supabase Purge Error: ' + purgeError.message);
        }

        purged = count || 0;
      }
    }

    const reachRows = await reachPromise;

    return NextResponse.json({
      success: true,
      processed: rowsToUpsert.length,
      purged,
      reach_rows: reachRows,
      schema_complete: schemaComplete,
    });

  } catch (error: any) {
    console.error('Meta Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Consulta separada para alcance e frequencia, nos tres niveis.
 *
 * Alcance conta PESSOAS, nao eventos — e por isso nao pode ser somado de baixo
 * para cima. Quem viu dois anuncios do mesmo conjunto e uma pessoa so: somar o
 * alcance dos anuncios daria um numero maior que o alcance real do conjunto.
 * Nao ha como deduplicar isso do nosso lado, entao cada nivel e pedido ao Meta
 * ja deduplicado.
 *
 * As tres consultas saem juntas, e a tabela distingue os niveis pelas colunas
 * vazias: linha de campanha nao tem conjunto nem anuncio, linha de conjunto
 * nao tem anuncio.
 *
 * Nao derruba a sincronizacao se falhar: alcance e informacao de apoio, e o
 * gasto — que move todo o resto do painel — ja esta gravado.
 */
async function syncDailyReach(params: {
  token: string;
  account: string;
  since: string;
  until: string;
}): Promise<number> {
  const { token, account, since, until } = params;

  try {
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

    const fetchLevel = async (level: 'campaign' | 'adset' | 'ad') => {
      const fields = ['campaign_id', 'reach', 'frequency', 'impressions', 'date_start'];
      if (level === 'adset' || level === 'ad') fields.push('adset_id');
      if (level === 'ad') fields.push('ad_id');

      const rows: Record<string, unknown>[] = [];

      let url: string | null =
        `https://graph.facebook.com/${API_VERSION}/act_${account}/insights` +
        `?level=${level}&time_increment=1&time_range=${timeRange}` +
        `&fields=${fields.join(',')}&limit=${ROW_LIMIT}&access_token=${encodeURIComponent(token)}`;

      let guard = 0;

      while (url && guard < PAGE_GUARD) {
        guard++;
        const res: Response = await fetch(url);
        const data: any = await res.json();

        if (data.error) throw new Error(data.error.message);

        for (const r of (data.data || [])) {
          const adsetId = r.adset_id || null;
          const adId = r.ad_id || null;

          rows.push({
            key: `${r.date_start}|${r.campaign_id}|${adsetId || ''}|${adId || ''}`,
            date: r.date_start,
            campaign_id: r.campaign_id || null,
            adset_id: adsetId,
            ad_id: adId,
            reach: Number(r.reach) || 0,
            frequency: Number(r.frequency) || 0,
            impressions: Number(r.impressions) || 0,
            updated_at: new Date().toISOString(),
          });
        }

        url = (data.paging && data.paging.next) ? data.paging.next : null;
      }

      return rows;
    };

    const batches = await Promise.all([
      fetchLevel('campaign'),
      fetchLevel('adset'),
      fetchLevel('ad'),
    ]);

    const rows = batches.flat();
    if (rows.length === 0) return 0;

    const { error } = await getSupabaseAdmin()
      .from('meta_ads_daily_reach')
      .upsert(rows, { onConflict: 'key' });

    // Tabela ainda nao criada (migracao pendente) cai aqui e e ignorada.
    if (error) throw new Error(error.message);

    return rows.length;
  } catch (error: any) {
    console.error('Meta reach sync skipped:', error.message);
    return 0;
  }
}
