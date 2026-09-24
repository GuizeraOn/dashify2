'use client';

import { useSearchParams } from 'next/navigation';
import { useReports } from '@/hooks/useReports';
import HourlyHeatmap from '@/components/charts/HourlyHeatmap';
import CountryRanking from '@/components/charts/CountryRanking';
import ConversionFunnel from '@/components/charts/ConversionFunnel';
import { ChartSkeleton } from '@/components/LoadingSkeleton';

export default function RelatoriosPage() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || 'today';
  const products = searchParams.getAll('product');

  const { data, isLoading, isError } = useReports({ period, products });

  if (isError) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-red-500">
        Erro ao carregar relatórios.
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Relatórios</h1>
        <p className="text-sm text-gray-400">Análise profunda de conversões e comportamento.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Heatmap (Takes up more space if possible, or spans 2 cols on lg) */}
        <div className="lg:col-span-2 xl:col-span-3">
          {isLoading ? <ChartSkeleton /> : <HourlyHeatmap data={data?.heatmapData} />}
        </div>

        {/* Funnel */}
        <div className="lg:col-span-1 xl:col-span-1 h-[300px]">
          {isLoading ? <ChartSkeleton /> : <ConversionFunnel data={data?.funnelData} />}
        </div>

        {/* Countries */}
        <div className="lg:col-span-1 xl:col-span-2 h-[300px]">
          {isLoading ? <ChartSkeleton /> : <CountryRanking data={data?.countryData} />}
        </div>

      </div>
    </div>
  );
}
