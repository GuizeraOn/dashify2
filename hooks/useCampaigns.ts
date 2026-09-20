import { useQuery } from '@tanstack/react-query';

export interface CampaignRow {
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface UseCampaignsOptions {
  period?: string;
}

export function useCampaigns({ period = 'today' }: UseCampaignsOptions = {}) {
  return useQuery<{ campaigns: CampaignRow[] }>({
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
