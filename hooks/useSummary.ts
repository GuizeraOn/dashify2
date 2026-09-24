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
    resolved?: number;
    approval_rate: number;
    breakdown: { status: string; count: number }[];
  };
  funnel_stats?: FunnelStats;
  country_stats?: CountryStat[];
  country_approval_stats?: CountryApprovalStat[];
  weekday_stats?: WeekdayStat[];
  available_products?: string[];
}

export interface CountryStat {
  country: string;
  revenue: number;
  orders: number;
  /** Participacao no faturamento aprovado, em porcentagem. */
  share: number;
}

export interface CountryApprovalStat {
  country: string;
  /** Aprovadas, contando as que depois foram reembolsadas. */
  approved: number;
  refused: number;
  /** Tentativas com desfecho — exclui boleto e Pix ainda nao pagos. */
  resolved: number;
  approval_rate: number;
}

export interface WeekdayStat {
  /** 0 = domingo, como no getUTCDay. */
  weekday: number;
  label: string;
  /** Abreviacao de tres letras, para o eixo do grafico. */
  short: string;
  revenue: number;
  orders: number;
  share: number;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface FunnelStats {
  /** false quando a conta nao reporta cliques no link e caimos no clique total. */
  clicks_are_link_clicks: boolean;
  /** true quando a ultima etapa conta apenas os produtos de front. */
  approved_is_front_only: boolean;
  /** true quando ha pais filtrado e o funil seguiu global mesmo assim. */
  ignores_country_filter: boolean;
  steps: FunnelStep[];
}

interface UseSummaryOptions {
  period?: string;
  campaign?: string;
  /** Vazio quer dizer todos. Vai na URL repetido: ?product=A&product=B */
  products?: string[];
  country?: string;
  dateStart?: string;
  dateEnd?: string;
}

export function useSummary({
  period = 'today',
  campaign,
  products,
  country,
  dateStart,
  dateEnd,
}: UseSummaryOptions = {}) {
  return useQuery<SummaryData>({
    queryKey: ['summary', period, campaign, products, country, dateStart, dateEnd],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (campaign) params.append('campaign', campaign);
      products?.forEach((item) => params.append('product', item));
      if (country) params.append('country', country);
      if (dateStart) params.append('dateStart', dateStart);
      if (dateEnd) params.append('dateEnd', dateEnd);

      const res = await fetch(`/api/summary?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch summary');
      }
      return res.json();
    },
  });
}
