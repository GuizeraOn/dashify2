import { useQuery } from '@tanstack/react-query';

export interface HeatmapItem {
  day: number;
  hour: number;
  count: number;
}

export interface FunnelItem {
  step: string;
  count: number;
}

export interface CountryItem {
  country: string;
  revenue: number;
}

export interface ReportsData {
  heatmapData: HeatmapItem[];
  funnelData: FunnelItem[];
  countryData: CountryItem[];
}

interface UseReportsOptions {
  period?: string;
  /** Vazio quer dizer todos. Vai na URL repetido: ?product=A&product=B */
  products?: string[];
}

export function useReports({ period = 'today', products }: UseReportsOptions = {}) {
  return useQuery<ReportsData>({
    queryKey: ['reports', period, products],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      products?.forEach((item) => params.append('product', item));

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch reports');
      }
      return res.json();
    },
  });
}
