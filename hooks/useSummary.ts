import { useQuery } from '@tanstack/react-query';
import { KPIs } from '@/lib/types';

export interface SummaryData {
  kpis: KPIs;
  metadata: {
    dateStart?: string;
    dateEnd?: string;
  };
  daily_stats?: any[];
  payment_stats?: any[];
  card_approval_stats?: {
    approved: number;
    refused: number;
    total: number;
    approval_rate: number;
    breakdown: { status: string; count: number }[];
  };
  available_products?: string[];
}

interface UseSummaryOptions {
  period?: string;
  campaign?: string;
  product?: string;
}

export function useSummary({ period = 'today', campaign, product }: UseSummaryOptions = {}) {
  return useQuery<SummaryData>({
    queryKey: ['summary', period, campaign, product],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (campaign) params.append('campaign', campaign);
      if (product) params.append('product', product);

      const res = await fetch(`/api/summary?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch summary');
      }
      return res.json();
    },
  });
}
