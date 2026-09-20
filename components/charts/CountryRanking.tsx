'use client';

import { useMemo } from 'react';
import { CountryItem } from '@/hooks/useReports';

interface CountryRankingProps {
  data?: CountryItem[];
}

export default function CountryRanking({ data = [] }: CountryRankingProps) {
  const maxRev = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(d => d.revenue));
  }, [data]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  if (!data.length) {
    return (
      <div className="w-full h-full min-h-[250px] bg-[#1E1E1E] rounded-xl p-5 shadow-sm flex items-center justify-center text-gray-500">
        Sem dados
      </div>
    );
  }

  return (
    <div className="w-full bg-[#1E1E1E] rounded-xl p-5 shadow-sm flex flex-col h-full">
      <h3 className="font-medium text-gray-200 mb-6">Top Países (Faturamento)</h3>
      
      <div className="flex flex-col gap-4 flex-1 justify-center">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300 font-medium">{item.country}</span>
              <span className="text-white">{formatCurrency(item.revenue)}</span>
            </div>
            {/* Progress bar background */}
            <div className="w-full bg-[#333] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${maxRev > 0 ? (item.revenue / maxRev) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
