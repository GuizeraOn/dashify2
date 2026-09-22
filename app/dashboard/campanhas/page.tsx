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

  const { data, isLoading, isError, isFetching } = useCampaigns({ period, level });

  /**
   * O nivel que a tabela esta mostrando e o da RESPOSTA, nao o do clique.
   *
   * Enquanto a consulta nova nao chega, os dados na tela ainda sao os do nivel
   * anterior. Se os cabecalhos seguissem o clique, por alguns segundos a
   * tabela diria "Anuncio" com as linhas das campanhas — numeros certos sob um
   * rotulo errado, que e pior do que esperar. O botao aceso segue o clique,
   * para o toque ter resposta imediata.
   */
  const shownLevel = data?.level ?? level;
  const isSwitchingLevel = isFetching && shownLevel !== level;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const formatInt = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const current = LEVEL_OPTIONS.find((option) => option.value === shownLevel)!;

  /**
   * O pai vai embaixo do nome, e nao numa coluna propria: nomes de conjunto e
   * anuncio ja sao longos, e mais uma coluna de texto empurraria os numeros
   * para fora da tela.
   */
  const parentLine = (row: CampaignRow) => {
    if (shownLevel === 'campaign') return null;
    if (shownLevel === 'adset') return row.campaign_name;
    // No nivel de anuncio a linha de apoio mostra so o conjunto: o nome da
    // campanha e longo e quase sempre o mesmo, e ocuparia o espaco inteiro
    // justamente antes da parte que distingue uma linha da outra. O caminho
    // completo continua no title.
    return row.adset_name;
  };

  const parentTitle = (row: CampaignRow) => {
    if (shownLevel === 'campaign') return undefined;
    if (shownLevel === 'adset') return row.campaign_name;
    return [row.campaign_name, row.adset_name].filter(Boolean).join(' › ');
  };

  /** Numero opcional: "—" quando nao ha denominador para a conta. */
  const optional = (value: number | null, format: (v: number) => string) =>
    value === null ? <span className="text-gray-600">—</span> : format(value);

  /**
   * A ordem daqui para baixo e a mesma do gerenciador de anuncios, para a
   * leitura ser a mesma nos dois lugares. As colunas da planilha — venda de
   * verdade, faturamento, CPA, lucro — ficam agrupadas no fim, porque nao
   * existem no Meta e sao o motivo de este painel existir.
   */
  const columns: Column<CampaignRow>[] = [
    {
      key: 'name',
      header: current.label.replace(/s$/, ''),
      accessor: r => r.name,
      sticky: true,
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
      key: 'meta_purchases',
      header: 'Resultados',
      accessor: r => r.meta_purchases,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'cost_per_result',
      header: 'Custo/result.',
      accessor: r => r.cost_per_result ?? Infinity,
      render: (_v, row) => optional(row.cost_per_result, formatCurrency),
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
      key: 'post_comments',
      header: 'Coment.',
      accessor: r => r.post_comments ?? -1,
      render: (_v, row) => optional(row.post_comments, formatInt),
      align: 'right'
    },
    {
      key: 'reach',
      header: 'Alcance',
      accessor: r => r.reach,
      render: (v) => (v > 0 ? formatInt(v) : <span className="text-gray-600">—</span>),
      align: 'right'
    },
    {
      key: 'hook_rate',
      header: 'Hook Rate',
      accessor: r => r.hook_rate ?? -1,
      render: (_v, row) => optional(row.hook_rate, formatPercent),
      align: 'right'
    },
    {
      key: 'hold_rate',
      header: 'Hold Rate',
      accessor: r => r.hold_rate ?? -1,
      render: (_v, row) => optional(row.hold_rate, formatPercent),
      align: 'right'
    },
    {
      key: 'frequency',
      header: 'Frequência',
      accessor: r => r.frequency ?? -1,
      render: (_v, row) => optional(row.frequency, formatNumber),
      align: 'right'
    },
    {
      key: 'spend',
      header: 'Valor gasto',
      accessor: r => r.spend,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'cpm',
      header: 'CPM',
      accessor: r => r.cpm,
      render: (v) => formatCurrency(v),
      align: 'right'
    },
    {
      key: 'link_clicks',
      header: 'Cliques no link',
      accessor: r => r.link_clicks,
      render: (v) => formatInt(v),
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
      key: 'lpv_rate',
      header: 'Connect Rate',
      accessor: r => r.lpv_rate,
      render: (v) => formatPercent(v),
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
      key: 'initiate_checkout',
      header: 'ICs',
      accessor: r => r.initiate_checkout,
      render: (v) => formatInt(v),
      align: 'right'
    },
    {
      key: 'cost_per_ic',
      header: 'Custo/IC',
      accessor: r => r.cost_per_ic ?? Infinity,
      render: (_v, row) => optional(row.cost_per_ic, formatCurrency),
      align: 'right'
    },
    {
      key: 'meta_roas',
      header: 'ROAS compras',
      accessor: r => r.meta_roas ?? 0,
      render: (_v, row) => optional(row.meta_roas, formatNumber),
      align: 'right'
    },
    {
      key: 'checkout_conversion',
      header: 'CHK CONV.',
      accessor: r => r.checkout_conversion ?? -1,
      render: (_v, row) => optional(row.checkout_conversion, formatPercent),
      align: 'right'
    },
    {
      key: 'meta_purchase_value',
      header: 'Valor conv.',
      accessor: r => r.meta_purchase_value,
      render: (v) => formatCurrency(v),
      align: 'right'
    },

    // --- Daqui para baixo, o que so este painel tem: a venda da planilha. ---
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
      render: (_v, row) => optional(row.cpa, formatCurrency),
      align: 'right'
    },
    {
      key: 'roas',
      header: 'ROAS real',
      accessor: r => r.roas ?? 0,
      render: (_v, row) => optional(row.roas, formatNumber),
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

      {/* Esmaece enquanto o nivel novo nao chega, para a troca nao parecer
          travada nem os numeros antigos parecerem os novos. */}
      <div className={cn('transition-opacity', isSwitchingLevel && 'opacity-50')}>
        <DataTable
          key={shownLevel}
          data={data?.rows || []}
          columns={columns}
          defaultSortKey="spend"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {/* Venda aprovada que nao casou com nada neste nivel: trafego organico,
            outra fonte, ou anuncio sem o UTM correspondente na URL. Fica
            visivel para a soma da tabela nunca parecer o faturamento total por
            engano. */}
        {data?.unattributed && data.unattributed.sales > 0 && (
          <p className="text-xs text-gray-500">
            {formatInt(data.unattributed.sales)} venda{data.unattributed.sales === 1 ? '' : 's'} aprovada
            {data.unattributed.sales === 1 ? '' : 's'} ({formatCurrency(data.unattributed.revenue)}) sem
            {shownLevel === 'campaign' ? ' campanha' : shownLevel === 'adset' ? ' conjunto' : ' anúncio'} identificado —
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
