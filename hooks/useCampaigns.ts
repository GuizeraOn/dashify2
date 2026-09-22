import { useQuery } from '@tanstack/react-query';

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  /** Gasto declarado pelo Meta, sem o imposto. */
  spend: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  initiate_checkout: number;
  /** Compras atribuidas pelo pixel do Meta. */
  meta_purchases: number;
  /** Vendas aprovadas da planilha, casadas por utm_campaign. */
  sales: number;
  revenue: number;
  ctr: number;
  cpc: number;
  lpv_rate: number;
  /** null quando a campanha ainda nao teve venda atribuida. */
  cpa: number | null;
  roas: number | null;
  profit: number;
}

export interface CampaignsResponse {
  campaigns: CampaignRow[];
  unattributed: { sales: number; revenue: number };
}

interface UseCampaignsOptions {
  period?: string;
}

export function useCampaigns({ period = 'today' }: UseCampaignsOptions = {}) {
  return useQuery<CampaignsResponse>({
    queryKey: ['campaigns', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      return res.json();
    },
  });
}
