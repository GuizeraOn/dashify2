'use client';

import { useMemo } from 'react';
import { HeatmapItem } from '@/hooks/useReports';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface HourlyHeatmapProps {
  data?: HeatmapItem[];
}

export default function HourlyHeatmap({ data = [] }: HourlyHeatmapProps) {
  const maxCount = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map(d => d.count));
  }, [data]);

  const getOpacity = (count: number) => {
    if (count === 0) return 0;
    return Math.max(0.1, count / maxCount);
  };

  const getCount = (day: number, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item ? item.count : 0;
  };

  return (
    <div className="w-full bg-[#1E1E1E] rounded-xl p-5 shadow-sm overflow-x-auto">
      <h3 className="font-medium text-gray-200 mb-4">Vendas por Horário</h3>
      
      <div className="min-w-[600px]">
        {/* Hours Header */}
        <div className="flex ml-10 mb-2">
          {HOURS.map(h => (
            <div key={h} className="flex-1 text-center text-[10px] text-gray-500">
              {h}h
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-1">
          {DAYS.map((dayName, dIdx) => (
            <div key={dIdx} className="flex items-center">
              <div className="w-10 text-xs text-gray-400 font-medium">{dayName}</div>
              <div className="flex flex-1 gap-1">
                {HOURS.map(hIdx => {
                  const count = getCount(dIdx, hIdx);
                  return (
                    <div 
                      key={hIdx} 
                      className="flex-1 aspect-square rounded-sm bg-blue-500 transition-opacity hover:opacity-100 group relative"
                      style={{ opacity: count === 0 ? 0.05 : getOpacity(count) }}
                    >
                      {/* Simple HTML Tooltip */}
                      {count > 0 && (
                        <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 z-50 bg-[#333] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-md">
                          {count} vendas
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
