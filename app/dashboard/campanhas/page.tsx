'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCampaigns, CampaignRow, CampaignLevel } from '@/hooks/useCampaigns';
import { DataTable, Column } from '@/components/ui/DataTable';
import { PerformanceBadge } from '@/components/ui/PerformanceBadge';
import { cn } from '@/lib/utils';

/**
 * Cada nivel casa as vendas por um UTM diferente — por isso o texto de apoio
 * muda junto com a tabela: o que explica a atribuicao no nivel de campanha nao
 * vale no de anuncio.
 */
const LEVEL_OPTIONS: { value: CampaignLevel; label: string; utm: string }[] = [
  { value: 'campaign', label: 'Campanhas', utm: 'utm_campaign' },
  { value: 'adset', label: 'Conjuntos', utm: 'utm_term' },
  { value: 'ad', label: 'Anúncios', utm: 'utm_content' },
];

export default function CampanhasPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'today';

  const [level, setLevel] = useState<CampaignLevel>('campaign');

  const { data, isLoading, isError } = useCampaigns({ period, level });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const formatInt = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const current = LEVEL_OPTIONS.find((option) => option.value === level)!;

  /**
   * O pai vai embaixo do nome, e nao numa coluna propria: nomes de conjunto e
   * anuncio ja sao longos, e mais uma coluna de texto empurraria os numeros
   * para fora da tela.
   */
  const parentLine = (row: CampaignRow) => {
    if (level === 'campaign') return null;
    if (level === 'adset') return row.campaign_name;
    // No nivel de anuncio a linha de apoio mostra so o conjunto: o nome da
    // campanha e longo e quase sempre o mesmo, e ocuparia o espaco inteiro
    // justamente antes da parte que distingue uma linha da outra. O caminho
    // completo continua no title.
    return row.adset_name;
  };

  const parentTitle = (row: CampaignRow) => {
    if (level === 'campaign') return undefined;
    if (level === 'adset') return row.campaign_name;
    return [row.campaign_name, row.adset_name].filter(Boolean).join(' › ');
  };

  const columns: Column<CampaignRow>[] = [
    {
      key: 'name',
      header: current.label.replace(/s$/, ''),
      accessor: r => r.name,
      // A largura minima existe porque a tabela distribui espaco sozinha: sem
      // ela, "AD 35 (VIDEO)" quebra em tres linhas para as colunas de numero
      // caberem, e cada linha da tabela vira um paragrafo. O caminho do pai
      // fica numa linha so, cortado com reticencias, com o texto inteiro no
      // title para quem passar o mouse.
      render: (v, row) => (
        <div className="flex min-w-[140px] max-w-[260px] flex-col">
          <span className="font-medium text-gray-200">{v}</span>
          {parentLine(row) && (
            <span className="mt-0.5 truncate text-xs text-gray-500" title={parentTitle(row)}>
              {parentLine(row)}
            </span>
          )}
        </div>
      )
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Campanhas</h1>
          <p className="text-sm text-gray-400">
            Gasto e entrega vêm do Meta Ads; vendas e faturamento vêm da planilha,
            casados por <code className="text-gray-500">{current.utm}</code>.
          </p>
        </div>

        {/* Os tres niveis leem a mesma tabela, somada por uma coluna diferente. */}
        <div className="flex flex-shrink-0 rounded-lg border border-[#333] bg-[#1E1E1E] p-1">
          {LEVEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setLevel(option.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                level === option.value
                  ? 'bg-[#0f62fe] text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        key={level}
        data={data?.rows || []}
        columns={columns}
        defaultSortKey="spend"
      />

      <div className="mt-4 flex flex-col gap-1.5">
        {/* Venda aprovada que nao casou com nada neste nivel: trafego organico,
            outra fonte, ou anuncio sem o UTM correspondente na URL. Fica
            visivel para a soma da tabela nunca parecer o faturamento total por
            engano. */}
        {data?.unattributed && data.unattributed.sales > 0 && (
          <p className="text-xs text-gray-500">
            {formatInt(data.unattributed.sales)} venda{data.unattributed.sales === 1 ? '' : 's'} aprovada
            {data.unattributed.sales === 1 ? '' : 's'} ({formatCurrency(data.unattributed.revenue)}) sem
            {level === 'campaign' ? ' campanha' : level === 'adset' ? ' conjunto' : ' anúncio'} identificado —
            sem <code className="text-gray-400">{current.utm}</code> na URL do anúncio, ou vindas de
            outra origem.
          </p>
        )}

        {/* Gasto anterior a virada da coleta para o nivel de anuncio: as linhas
            daqueles dias so sabem a campanha, entao nao entram na tabela de
            conjuntos nem na de anuncios. */}
        {data?.unsplit && data.unsplit.spend > 0 && (
          <p className="text-xs text-gray-500">
            {formatCurrency(data.unsplit.spend)} em gasto não entra nesta tabela: são dias anteriores
            à coleta por anúncio, em que o Meta só foi consultado no nível de campanha.
          </p>
        )}
      </div>
    </div>
  );
}
