'use client';

import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | null;
  type?: 'currency' | 'percent' | 'number';
  tooltip?: string;
  inverseColors?: boolean; // Se true, vermelho é bom e verde é ruim (ex: CPA)
  /**
   * Esmaece o card e explica no tooltip por que o numero nao e confiavel no
   * recorte atual. Usado quando ha filtro de pais: o gasto do Meta nao e
   * separado por pais, entao tudo que deriva dele mistura bases diferentes.
   */
  mutedReason?: string;
  /**
   * Some com o numero por um instante. Ligado para todos os cards ao mesmo
   * tempo quando os dados sao atualizados, dando o sinal de "recarregou" sem
   * destacar quem mudou.
   */
  isRefreshing?: boolean;
}

export default function KPICard({ 
  title, 
  value, 
  type = 'currency', 
  tooltip,
  inverseColors = false,
  mutedReason,
  isRefreshing = false
}: KPICardProps) {

  const isNull = value === null || value === undefined;
  const isPositive = !isNull && value > 0;
  const isNegative = !isNull && value < 0;

  // Formatting logic
  let displayValue = 'N/A';
  if (!isNull) {
    if (type === 'currency') {
      displayValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    } else if (type === 'percent') {
      displayValue = `${value.toFixed(2)}%`;
    } else {
      displayValue = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  // Color logic
  let colorClass = 'text-white';
  
  if (isNull || isNegative) {
    colorClass = inverseColors && !isNull ? 'text-green-500' : 'text-red-500';
  } else if (isPositive) {
    colorClass = inverseColors ? 'text-red-500' : 'text-green-500';
  }

  // Se o título for 'Gastos com Anúncios' ou similar que não tem cor boa/ruim definida:
  if (title.toLowerCase().includes('gastos') || title.toLowerCase().includes('faturamento') || title.toLowerCase().includes('pendentes') || title.toLowerCase().includes('cpa')) {
    colorClass = 'text-white';
  }

  return (
    <div
      className={cn(
        'bg-[#1E1E1E] rounded-xl px-6 py-5 flex flex-col shadow-sm h-full w-full transition-opacity',
        mutedReason && 'opacity-40'
      )}
    >
      <div className="flex justify-between items-start mb-1 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {tooltip && (
          <Tooltip
            content={
              <div className="max-w-[220px] text-center">
                <p>{tooltip}</p>
                {mutedReason && <p className="mt-2 text-amber-400">{mutedReason}</p>}
              </div>
            }
          >
            <button className="text-gray-500 hover:text-gray-300 outline-none">
              <Info size={16} />
            </button>
          </Tooltip>
        )}
      </div>
      
      <div className="min-w-0">
        <span
          className={cn(
            'text-2xl font-bold tracking-tight truncate block transition-opacity duration-200',
            colorClass,
            isRefreshing && 'opacity-0'
          )}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
