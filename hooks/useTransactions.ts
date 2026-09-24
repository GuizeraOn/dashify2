import { useQuery } from '@tanstack/react-query';
import { VendasRow } from '@/lib/types';

interface UseTransactionsOptions {
  period?: string;
  /** Vazio quer dizer todos. Vai na URL repetido: ?product=A&product=B */
  products?: string[];
}

export function useTransactions({ period = 'today', products }: UseTransactionsOptions = {}) {
  return useQuery<{ transactions: VendasRow[] }>({
    queryKey: ['transactions', period, products],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      products?.forEach((item) => params.append('product', item));

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return res.json();
    },
  });
}
