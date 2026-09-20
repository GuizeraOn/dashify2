'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSummary } from '@/hooks/useSummary';
import KPICard from '@/components/KPICard';
import GridLayoutWrapper from '@/components/layout/GridLayoutWrapper';
import { KPISkeleton, ChartSkeleton } from '@/components/LoadingSkeleton';
import RevenueVsSpendChart from '@/components/charts/RevenueVsSpendChart';
import PaymentMethodChart from '@/components/charts/PaymentMethodChart';
import CardApprovalChart from '@/components/charts/CardApprovalChart';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const period = searchParams.get('period') || 'today';
  const campaign = searchParams.get('campaign') || undefined;
  const product = searchParams.get('product') || undefined;

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

  const { data, isLoading, isError, error } = useSummary({ period, campaign, product });

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
  }> = [
    {
      key: 'kpi-net_revenue',
      title: 'Faturamento Líquido',
      value: kpis?.net_revenue ?? null,
      tooltip: 'Soma do faturamento líquido (apenas vendas Aprovadas)',
    },
    {
      key: 'kpi-spend',
      title: 'Gastos com Anúncios',
      value: kpis?.spend ?? null,
      tooltip: 'Soma total do custo de campanhas no Meta Ads',
    },
    {
      key: 'kpi-profit',
      title: 'Lucro',
      value: kpis?.profit ?? null,
      tooltip: 'Faturamento Líquido - (Gastos com Anúncios + 13% Imposto Meta)',
    },
    {
      key: 'kpi-roi',
      title: 'ROI',
      value: kpis?.roas ?? null,
      type: 'number',
      tooltip: 'Retorno sobre Investimento (Bruto): Faturamento Bruto Aprovado / (Gastos + 13% Imposto Meta)',
    },
    {
      key: 'kpi-cpa',
      title: 'CPA',
      value: kpis?.cpa ?? null,
      inverseColors: true,
      tooltip: 'Custo por Aquisição: (Gastos + 13% Imposto Meta) / Quantidade de Vendas Aprovadas',
    },
    {
      key: 'kpi-roas',
      title: 'ROAS',
      value: kpis?.roi ?? null,
      type: 'number',
      tooltip: 'Retorno sobre o Gasto: Lucro / (Gastos + 13% Imposto Meta)',
    },
    {
      key: 'kpi-margin',
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
              />
            )}
          </div>
        ))}

        {/* Charts */}
        <div key="chart-revenue_spend" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-semibold text-gray-200">Faturamento vs Gasto Diário</h3>
          </div>
          <div className="flex-1 w-full relative min-h-0">
            {isLoading ? <ChartSkeleton /> : <RevenueVsSpendChart data={data?.daily_stats} />}
          </div>
        </div>

        <div key="chart-payment" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-semibold text-gray-200">Meios de Pagamento</h3>
          </div>
          <div className="flex-1 w-full relative min-h-0">
            {isLoading ? <ChartSkeleton /> : <PaymentMethodChart data={data?.payment_stats} />}
          </div>
        </div>

        <div key="chart-card_approval" className="bg-[#1E1E1E] rounded-xl p-5 flex flex-col shadow-sm h-full w-full">
          <div className="flex-1 w-full relative min-h-0">
            {isLoading ? <ChartSkeleton /> : <CardApprovalChart data={data?.card_approval_stats} />}
          </div>
        </div>
      </GridLayoutWrapper>

    </div>
  );
}
