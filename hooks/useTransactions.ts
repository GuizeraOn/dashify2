import { useQuery } from '@tanstack/react-query';
import { VendasRow } from '@/lib/types';

interface UseTransactionsOptions {
  period?: string;
  product?: string;
}

export function useTransactions({ period = 'today', product }: UseTransactionsOptions = {}) {
  return useQuery<{ transactions: VendasRow[] }>({
    queryKey: ['transactions', period, product],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append('period', period);
      if (product) params.append('product', product);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return res.json();
    },
  });
}
