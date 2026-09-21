import { NextResponse } from 'next/server';
import { resolvePeriod } from '@/lib/dates';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    
    // Periodo resolvido no fuso do negocio (ver lib/dates.ts).
    const { dateStart, dateEnd } = resolvePeriod(period, {
      dateStart: searchParams.get('dateStart') || undefined,
      dateEnd: searchParams.get('dateEnd') || undefined,
    });

    let query = getSupabaseAdmin().from('meta_ads_insights').select('*');
    if (dateStart) query = query.gte('date', dateStart);
    if (dateEnd) query = query.lte('date', dateEnd);

    const { data: metaData, error } = await query;

    if (error) {
      throw new Error('Supabase Error: ' + error.message);
    }

    // Group by campaign_name
    const campaignMap: Record<string, any> = {};

    metaData.forEach(row => {
      const name = row.campaign_name || 'Desconhecida';
      if (!campaignMap[name]) {
        campaignMap[name] = {
          campaign_name: name,
          spend: 0,
          impressions: 0,
          clicks: 0,
          purchases: 0,
          purchase_value: 0,
        };
      }
      campaignMap[name].spend += (row.spend || 0);
      campaignMap[name].impressions += (row.impressions || 0);
      campaignMap[name].clicks += (row.clicks || 0);
      campaignMap[name].purchases += (row.purchases || 0);
      campaignMap[name].purchase_value += (row.purchase_value || 0);
    });

    const campaigns = Object.values(campaignMap).map(c => {
      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
      const cpc = c.clicks > 0 ? (c.spend / c.clicks) : 0;
      const cpa = c.purchases > 0 ? (c.spend / c.purchases) : 0;
      const roas = c.spend > 0 ? (c.purchase_value / c.spend) : 0;
      
      return {
        ...c,
        ctr,
        cpc,
        cpa,
        roas
      };
    });

    // Sort by spend descending
    campaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
