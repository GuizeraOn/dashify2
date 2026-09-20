'use client';

import { useSearchParams } from 'next/navigation';
import { useCampaigns, CampaignRow } from '@/hooks/useCampaigns';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PerformanceBadge } from '@/components/ui/PerformanceBadge';

export default function CampanhasPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'today';

  const { data, isLoading, isError } = useCampaigns({ period });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) => 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const columns: Column<CampaignRow>[] = [
    {
      key: 'campaign_name',
      header: 'Campanha',
      accessor: r => r.campaign_name,
      render: (v) => <span className="font-medium text-gray-200">{v}</span>
    },
    {
      key: 'spend',
      header: 'Gasto',
      accessor: r => r.spend,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'purchases',
      header: 'Compras',
      accessor: r => r.purchases,
      align: 'center'
    },
    {
      key: 'purchase_value',
      header: 'Faturamento',
      accessor: r => r.purchase_value,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'cpa',
      header: 'CPA',
      accessor: r => r.cpa,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'roas',
      header: 'ROAS',
      accessor: r => r.roas,
      render: (v) => formatNumber(v),
      align: 'right'
    },
    {
      key: 'status',
      header: 'Performance',
      accessor: r => r.roas,
      render: (v) => <PerformanceBadge roas={v} />,
      align: 'center'
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
        Erro ao carregar campanhas.
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col animate-in fade-in duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Campanhas</h1>
          <p className="text-sm text-gray-400">Análise de performance por campanha no Meta Ads.</p>
        </div>
      </div>
      
      <DataTable 
        data={data?.campaigns || []} 
        columns={columns} 
        defaultSortKey="spend" 
      />
    </div>
  );
}
