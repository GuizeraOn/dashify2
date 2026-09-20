'use client';

import { FunnelItem } from '@/hooks/useReports';

interface ConversionFunnelProps {
  data?: FunnelItem[];
}

export default function ConversionFunnel({ data = [] }: ConversionFunnelProps) {
  if (!data.length) {
    return (
      <div className="w-full h-full min-h-[250px] bg-[#1E1E1E] rounded-xl p-5 shadow-sm flex items-center justify-center text-gray-500">
        Sem dados de funil
      </div>
    );
  }

  const maxCount = data[0].count; // Usually sorted descending

  return (
    <div className="w-full bg-[#1E1E1E] rounded-xl p-5 shadow-sm flex flex-col h-full">
      <h3 className="font-medium text-gray-200 mb-6">Funil de Vendas (Etapas)</h3>
      
      <div className="flex flex-col gap-3 flex-1 items-center justify-center">
        {data.map((item, idx) => {
          const widthPercent = Math.max(20, (item.count / maxCount) * 100);
          
          let dropoff = null;
          if (idx > 0) {
            const prev = data[idx - 1].count;
            const drop = prev > 0 ? ((item.count / prev) * 100).toFixed(1) : 0;
            dropoff = <div className="text-[10px] text-gray-500 my-1">↳ converteu {drop}% da etapa anterior</div>;
          }

          return (
            <div key={idx} className="w-full flex flex-col items-center">
              {dropoff}
              <div 
                className="bg-indigo-500/80 hover:bg-indigo-500 transition-colors rounded text-center py-2 flex flex-col justify-center text-white relative shadow-sm"
                style={{ width: `${widthPercent}%` }}
              >
                <span className="text-xs font-semibold">{item.step}</span>
                <span className="text-sm font-bold">{item.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
