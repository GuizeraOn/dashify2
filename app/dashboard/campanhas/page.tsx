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

  const formatInt = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

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
      key: 'impressions',
      header: 'Impressões',
      accessor: r => r.impressions,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'link_clicks',
      header: 'Cliques',
      accessor: r => r.link_clicks,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'ctr',
      header: 'CTR',
      accessor: r => r.ctr,
      render: (v) => formatPercent(v),
      align: 'right'
    },
    {
      key: 'cpc',
      header: 'CPC',
      accessor: r => r.cpc,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'landing_page_views',
      header: 'Vis. Página',
      accessor: r => r.landing_page_views,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'initiate_checkout',
      header: 'ICs',
      accessor: r => r.initiate_checkout,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'sales',
      header: 'Vendas',
      accessor: r => r.sales,
      render: (v) => formatInt(v),
      align: 'center'
    },
    {
      key: 'revenue',
      header: 'Faturamento',
      accessor: r => r.revenue,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'cpa',
      header: 'CPA',
      accessor: r => r.cpa ?? Infinity,
      render: (_v, row) => (row.cpa === null ? <span className="text-gray-600">—</span> : formatCurrency(row.cpa)),
      align: 'right'
    },
    {
      key: 'roas',
      header: 'ROAS',
      accessor: r => r.roas ?? 0,
      render: (_v, row) => (row.roas === null ? <span className="text-gray-600">—</span> : formatNumber(row.roas)),
      align: 'right'
    },
    {
      key: 'profit',
      header: 'Lucro',
      accessor: r => r.profit,
      render: (v) => (
        <span className={v >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(v)}</span>
      ),
      align: 'right'
    },
    {
      key: 'status',
      header: 'Performance',
      accessor: r => r.roas ?? 0,
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
          <p className="text-sm text-gray-400">
            Gasto e entrega vêm do Meta Ads; vendas e faturamento vêm da planilha,
            casados por <code className="text-gray-500">utm_campaign</code>.
          </p>
        </div>
      </div>
      
      <DataTable 
        data={data?.campaigns || []} 
        columns={columns} 
        defaultSortKey="spend" 
      />

      {/* Venda aprovada que nao casou com nenhuma campanha: trafego organico,
          outra fonte, ou anuncio sem utm_campaign na URL. Fica visivel para a
          soma da tabela nunca parecer o faturamento total por engano. */}
      {data?.unattributed && data.unattributed.sales > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          {formatInt(data.unattributed.sales)} venda{data.unattributed.sales === 1 ? '' : 's'} aprovada
          {data.unattributed.sales === 1 ? '' : 's'} ({formatCurrency(data.unattributed.revenue)}) sem
          campanha identificada — sem <code className="text-gray-400">utm_campaign</code> na URL do
          anúncio, ou vindas de outra origem.
        </p>
      )}
    </div>
  );
}
