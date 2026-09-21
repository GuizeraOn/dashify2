'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSummary } from '@/hooks/useSummary';
import { useRefreshStore } from '@/store/refreshStore';
import { cn } from '@/lib/utils';
import KPICard from '@/components/KPICard';
import GridLayoutWrapper from '@/components/layout/GridLayoutWrapper';
import { KPISkeleton, ChartSkeleton } from '@/components/LoadingSkeleton';
import RevenueVsSpendChart from '@/components/charts/RevenueVsSpendChart';
import PaymentMethodChart from '@/components/charts/PaymentMethodChart';
import CardApprovalChart from '@/components/charts/CardApprovalChart';
import MetaConversionFunnel from '@/components/charts/MetaConversionFunnel';
import SalesByCountry from '@/components/charts/SalesByCountry';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const period = searchParams.get('period') || 'today';
  const campaign = searchParams.get('campaign') || undefined;
  const product = searchParams.get('product') || undefined;
  const country = searchParams.get('country') || undefined;
  const dateStart = searchParams.get('dateStart') || undefined;
  const dateEnd = searchParams.get('dateEnd') || undefined;

  // O pais escolhido vive na URL, junto dos outros filtros: assim o estado
  // sobrevive ao recarregar e o link pode ser compartilhado.
  const handleCountrySelect = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set('country', next);
      } else {
        params.delete('country');
      }
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Sincroniza dados do Meta automaticamente ao entrar no dashboard
  useEffect(() => {
    async function autoSync() {
      try {
        await fetch('/api/meta/sync', { method: 'POST' });
        await queryClient.invalidateQueries();
      } catch (e) {
        console.warn('Auto-sync Meta falhou:', e);
      }
    }
    autoSync();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, isError, error, isFetching } = useSummary({
    period,
    campaign,
    product,
    country,
    dateStart,
    dateEnd,
  });

  // Os numeros somem no inicio da atualizacao e so voltam com os dados novos.
  // A bandeira do store cobre o "Atualizar" do Header, que comeca pela
  // sincronizacao do Meta; o isFetching cobre as demais rebuscas. O isLoading
  // fica de fora porque ali quem aparece e o esqueleto, nao os numeros.
  const isRefreshingFromHeader = useRefreshStore((state) => state.isRefreshing);
  const isRefreshing = isRefreshingFromHeader || (isFetching && !isLoading);

  if (isError) {
    return (
      <div className="p-6 bg-red-900/20 text-red-400 rounded-lg border border-red-900/50">
        <h3 className="font-bold mb-2">Erro ao carregar dados</h3>
        <p>{error.message}</p>
        <p className="text-sm mt-4 text-red-500">Verifique se as variáveis de ambiente GOOGLE_SERVICE_ACCOUNT_JSON e SPREADSHEET_ID estão configuradas corretamente no arquivo .env.local.</p>
      </div>
    );
  }

  const kpis = data?.kpis;

  // Definicao unica dos KPIs: as chaves precisam ser identicas em loading e em
  // estado carregado, senao o react-grid-layout auto-posiciona os skeletons e
  // reorganiza tudo quando os dados chegam.
  const kpiItems: Array<{
    key: string;
    title: string;
    value: number | null;
    type?: 'currency' | 'percent' | 'number';
    tooltip: string;
    inverseColors?: boolean;
    /** Deriva do gasto do Meta, que nao e separado por pais. */
    dependsOnSpend?: boolean;
  }> = [
    {
      key: 'kpi-net_revenue',
      title: 'Faturamento Líquido',
      value: kpis?.net_revenue ?? null,
      tooltip: 'Soma do faturamento líquido (apenas vendas Aprovadas)',
    },
    {
      key: 'kpi-spend',
      dependsOnSpend: true,
      title: 'Gastos com Anúncios',
      value: kpis?.spend ?? null,
      tooltip: 'Soma total do custo de campanhas no Meta Ads',
    },
    {
      key: 'kpi-profit',
      dependsOnSpend: true,
      title: 'Lucro',
      value: kpis?.profit ?? null,
      tooltip: 'Faturamento Líquido - (Gastos com Anúncios + 13% Imposto Meta)',
    },
    {
      key: 'kpi-roi',
      dependsOnSpend: true,
      title: 'ROI',
      value: kpis?.roas ?? null,
      type: 'number',
      tooltip: 'Retorno sobre Investimento (Bruto): Faturamento Bruto Aprovado / (Gastos + 13% Imposto Meta)',
    },
    {
      key: 'kpi-cpa',
      dependsOnSpend: true,
      title: 'CPA',
      value: kpis?.cpa ?? null,
      inverseColors: true,
      tooltip: 'Custo por Aquisição: (Gastos + 13% Imposto Meta) / Quantidade de Vendas Aprovadas',
    },
    {
      key: 'kpi-roas',
      dependsOnSpend: true,
      title: 'ROAS',
      value: kpis?.roi ?? null,
      type: 'number',
      tooltip: 'Retorno sobre o Gasto: Lucro / (Gastos + 13% Imposto Meta)',
    },
    {
      key: 'kpi-margin',
      dependsOnSpend: true,
      title: 'Margem de Lucro',
      value: kpis?.profit_margin ?? null,
      type: 'percent',
      tooltip: 'Lucro / Faturamento Líquido * 100',
    },
    {
      key: 'kpi-pending',
      title: 'Vendas Pendentes',
      value: kpis?.pending_revenue ?? null,
      tooltip: 'Soma do Faturamento Bruto de vendas com status Aguardando (Boletos e Pix não pagos)',
    },
    {
      key: 'kpi-refunded',
      title: 'Reembolsos',
      value: kpis?.refunded_revenue ?? null,
      inverseColors: true,
      tooltip: `Soma do Faturamento Bruto de vendas reembolsadas/estornadas${kpis?.refunded_count ? ` (${kpis.refunded_count} venda${kpis.refunded_count !== 1 ? 's' : ''})` : ''}`,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Grid Interativo */}
      <GridLayoutWrapper>
        {kpiItems.map((item) => (
          <div key={item.key} className="h-full w-full">
            {isLoading ? (
              <KPISkeleton />
            ) : (
              <KPICard
                title={item.title}
                value={item.value}
                type={item.type}
                tooltip={item.tooltip}
                inverseColors={item.inverseColors}
                isRefreshing={isRefreshing}
                mutedReason={
                  country && item.dependsOnSpend
                    ? `O gasto do Meta não é separado por país, então este número mistura o faturamento de ${country} com o gasto de todos os países.`
                    : undefined
                }
              />
            )}
          </div>
        ))}

        {/* Charts */}
        <div key="chart-revenue_spend" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-semibold text-gray-200">Faturamento vs Gasto Diário</h3>
          </div>
          <div
            className={cn(
              'flex-1 w-full relative min-h-0 transition-opacity duration-200',
              isRefreshing && 'opacity-0'
            )}
          >
            {isLoading ? <ChartSkeleton /> : <RevenueVsSpendChart data={data?.daily_stats} />}
          </div>
        </div>

        <div key="chart-payment" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-semibold text-gray-200">Meios de Pagamento</h3>
          </div>
          <div
            className={cn(
              'flex-1 w-full relative min-h-0 transition-opacity duration-200',
              isRefreshing && 'opacity-0'
            )}
          >
            {isLoading ? <ChartSkeleton /> : <PaymentMethodChart data={data?.payment_stats} />}
          </div>
        </div>

        <div key="chart-funnel" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex items-start justify-between mb-4 flex-shrink-0">
            <h3 className="font-semibold text-gray-200">Funil de Conversão (Meta Ads)</h3>
            <Tooltip
              content={
                <div className="max-w-[260px] text-left">
                  <p className="mb-1">O número grande é a fatia dos cliques que chegou até a etapa. Abaixo do nome, em cinza, está quanto ela reteve da etapa anterior — é ali que se vê o gargalo.</p>
                  <p className="mb-1"><b>Cliques</b>, <b>Vis. Página</b> e <b>ICs</b> vêm do Meta Ads.</p>
                  <p>
                    <b>Vendas Apr.</b> são as com pagamento confirmado
                    {data?.funnel_stats?.approved_is_front_only
                      ? ', contando apenas os produtos de front.'
                      : '.'}
                  </p>
                  {data?.funnel_stats?.ignores_country_filter && (
                    <p className="mt-2 text-amber-400">
                      O Meta não separa cliques, visualizações e ICs por país, então
                      o funil continua mostrando o total mesmo com {country} filtrado.
                    </p>
                  )}
                  {data?.funnel_stats && !data.funnel_stats.clicks_are_link_clicks && (
                    <p className="mt-2 text-amber-400">A conta não reporta cliques no link; usando o total de cliques.</p>
                  )}
                </div>
              }
            >
              <button className="text-gray-500 hover:text-gray-300 outline-none">
                <Info size={16} />
              </button>
            </Tooltip>
          </div>
          <div
            className={cn(
              'flex-1 w-full relative min-h-0 transition-opacity duration-200',
              isRefreshing && 'opacity-0'
            )}
          >
            {isLoading ? <ChartSkeleton /> : <MetaConversionFunnel data={data?.funnel_stats} />}
          </div>
        </div>

        <div key="chart-country" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          {/* Titulo e alternancia Ranking/Mapa ficam dentro do componente, na
              mesma linha — o seletor precisa do estado da visualizacao. */}
          <div
            className={cn(
              'flex-1 w-full relative min-h-0 transition-opacity duration-200',
              isRefreshing && 'opacity-0'
            )}
          >
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <SalesByCountry
                data={data?.country_stats}
                selected={country}
                onSelect={handleCountrySelect}
              />
            )}
          </div>
        </div>

        <div key="chart-card_approval" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div
            className={cn(
              'flex-1 w-full relative min-h-0 transition-opacity duration-200',
              isRefreshing && 'opacity-0'
            )}
          >
            {isLoading ? <ChartSkeleton /> : <CardApprovalChart data={data?.card_approval_stats} />}
          </div>
        </div>
      </GridLayoutWrapper>

    </div>
  );
}
