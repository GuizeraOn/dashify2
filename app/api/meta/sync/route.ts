import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { addDays, formatDay, startOfToday } from '@/lib/dates';

// Constants mimicking the Apps Script
const API_VERSION = 'v25.0';
const LEVEL: string = 'campaign';
const LOOKBACK_DAYS = 7;
const ROW_LIMIT = 500;
const BREAKDOWN = 'hourly_stats_aggregated_by_advertiser_time_zone';

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
      'ctr', 'cpc', 'cpm', 'actions', 'action_values', 'purchase_roas', 'date_start'
    ];
    
    const fields = dimFields.concat(metricFields).join(',');
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));

    let url: string | null = `https://graph.facebook.com/${API_VERSION}/act_${account}/insights` +
      `?level=${LEVEL}&time_increment=1&breakdowns=${BREAKDOWN}&time_range=${timeRange}` +
      `&fields=${fields}&limit=${ROW_LIMIT}&access_token=${encodeURIComponent(token)}`;

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

    while (url && guard < 30) { // Limit pagination guard
      guard++;
      const res: Response = await fetch(url);
      const data: any = await res.json();

      if (data.error) {
        throw new Error('Meta API Error: ' + data.error.message);
      }

      for (const r of (data.data || [])) {
        const hourLabel = r[BREAKDOWN] || '';
        const hour = hourLabel ? parseInt(hourLabel.substring(0, 2), 10) : null;

        const purchases = pickAction(r.actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
        const purchaseValue = pickAction(r.action_values, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
        const leads = pickAction(r.actions, ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']);
        const initiateCk = pickAction(r.actions, ['initiate_checkout', 'omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']);
        const lpv = pickAction(r.actions, ['landing_page_view']);
        
        let roas = pickAction(r.purchase_roas, ['purchase', 'omni_purchase']);
        if (!roas && Number(r.spend)) roas = purchaseValue / Number(r.spend);

        const adsetId = (LEVEL === 'adset' || LEVEL === 'ad') ? r.adset_id : null;
        const adId = (LEVEL === 'ad') ? r.ad_id : null;

        let key = `${r.date_start}|${hour}|${r.campaign_id}`;
        if (adsetId) key += `|${adsetId}`;
        if (adId) key += `|${adId}`;

        rowsToUpsert.push({
          key,
          date: r.date_start,
          hour: hour,
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
          currency: r.account_currency,
          updated_at: new Date().toISOString()
        });
      }

      url = (data.paging && data.paging.next) ? data.paging.next : null;
    }

    if (rowsToUpsert.length > 0) {
      // Upsert into Supabase
      const { error } = await getSupabaseAdmin()
        .from('meta_ads_insights')
        .upsert(rowsToUpsert, { onConflict: 'key' });

      if (error) {
        throw new Error('Supabase Upsert Error: ' + error.message);
      }
    }

    return NextResponse.json({ success: true, processed: rowsToUpsert.length });

  } catch (error: any) {
    console.error('Meta Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
