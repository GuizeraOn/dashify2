'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTransactions } from '@/hooks/useTransactions';
import { VendasRow } from '@/lib/types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';

export default function VendasPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'today';
  const product = searchParams.get('product') || undefined;

  const { data, isLoading, isError } = useTransactions({ period, product });

  // Local Filter States
  const [filterStatus, setFilterStatus] = useState<string>('qualquer');
  const [filterPayment, setFilterPayment] = useState<string>('qualquer');

  // Compute unique values for local filters
  const uniqueStatuses = useMemo(() => {
    if (!data?.transactions) return [];
    return Array.from(new Set(data.transactions.map(t => t.status).filter(Boolean))).sort();
  }, [data]);

  const uniquePayments = useMemo(() => {
    if (!data?.transactions) return [];
    return Array.from(new Set(data.transactions.map(t => t.payment_method).filter(Boolean))).sort();
  }, [data]);

  // Apply local filters
  const filteredData = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter(t => {
      const matchStatus = filterStatus === 'qualquer' || t.status === filterStatus;
      const matchPayment = filterPayment === 'qualquer' || t.payment_method === filterPayment;
      return matchStatus && matchPayment;
    });
  }, [data, filterStatus, filterPayment]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const columns: Column<VendasRow>[] = [
    {
      key: 'date',
      header: 'Data / Hora',
      accessor: r => r.date,
      // sorting by date string can be tricky if format is DD/MM/YYYY, but it's fine for now
      render: (v) => <span className="text-gray-400 whitespace-nowrap">{v}</span>
    },
    {
      key: 'cliente',
      header: 'Cliente',
      accessor: r => r.cliente,
      render: (v, r) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-200">{v || 'Sem nome'}</span>
          {r.phone && <span className="text-xs text-gray-500">{r.phone}</span>}
        </div>
      )
    },
    {
      key: 'produto',
      header: 'Produto',
      accessor: r => r.produto,
    },
    {
      key: 'country',
      header: 'País',
      accessor: r => r.country,
      align: 'center'
    },
    {
      key: 'payment_method',
      header: 'Pagamento',
      accessor: r => r.payment_method,
      render: (v) => <span className="capitalize">{v}</span>,
      align: 'center'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: r => r.status,
      render: (v) => <StatusBadge status={v} />,
      align: 'center'
    },
    {
      key: 'net_revenue_brl',
      header: 'Líquido R$',
      accessor: r => r.net_revenue_brl,
      render: (v) => formatCurrency(v),
      align: 'right'
    }
  ];

  if (isLoading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-500">
        Erro ao carregar vendas.
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Vendas</h1>
          <p className="text-sm text-gray-400">Lista completa de transações da Hotmart.</p>
        </div>
        
        {/* Local Filters Bar */}
        <div className="flex items-center gap-4 bg-[#1E1E1E] p-3 rounded-xl shadow-sm">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-gray-300 text-xs font-medium">Status da Venda</label>
            <Select 
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { label: 'Qualquer', value: 'qualquer' },
                ...uniqueStatuses.map(s => ({ label: s, value: s }))
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-gray-300 text-xs font-medium">Pagamento</label>
            <Select 
              value={filterPayment}
              onChange={setFilterPayment}
              options={[
                { label: 'Qualquer', value: 'qualquer' },
                ...uniquePayments.map(p => ({ label: p, value: p }))
              ]}
            />
          </div>
        </div>
      </div>
      
      <DataTable 
        data={filteredData} 
        columns={columns} 
        // defaultSortKey="" (no default sort to keep chronological order from backend reverse)
      />
    </div>
  );
}
