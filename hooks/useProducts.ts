import { useQuery } from '@tanstack/react-query';

export interface ProductRow {
  name: string;
  /** "Front-End", "Upsell 01"... como vem da planilha. */
  funnel_step: string;
  /** Codigo do produto na Perfect Pay. null enquanto nao foi descoberto. */
  code: string | null;
  checkout_url: string | null;
  /** Dias de garantia declarados no produto. */
  guarantee: number | null;
  sales: number;
  revenue: number;
  gross_revenue: number;
  attempts: number;
  refunded: number;
  refunded_value: number;
  pending: number;
  cancelled: number;
  average_ticket: number;
  approval_rate: number;
  revenue_share: number;
  top_countries: { label: string; count: number }[];
  top_payment_methods: { label: string; count: number }[];
}

export interface ProductsResponse {
  products: ProductRow[];
  total_revenue: number;
  checkout_base: string;
}

export function useProducts({ period = 'today' }: { period?: string } = {}) {
  return useQuery<ProductsResponse>({
    queryKey: ['products', period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}
