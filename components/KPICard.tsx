'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

/** Duracao da piscada. Precisa bater com a animacao kpi-flash do globals.css. */
const FLASH_DURATION_MS = 900;

/**
 * Retorna true por um instante toda vez que o valor muda de fato.
 *
 * Nao dispara na primeira renderizacao — a referencia ja nasce com o valor
 * atual. Sem isso o dashboard inteiro piscaria ao abrir, que e justamente a
 * sensacao de bagunca que se quer evitar.
 */
function useValueFlash(value: number | null) {
  const previous = useRef(value);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (previous.current === value) return;

    previous.current = value;
    setIsFlashing(true);

    const timer = setTimeout(() => setIsFlashing(false), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return isFlashing;
}

interface KPICardProps {
  title: string;
  value: number | null;
  type?: 'currency' | 'percent' | 'number';
  tooltip?: string;
  inverseColors?: boolean; // Se true, vermelho é bom e verde é ruim (ex: CPA)
}

export default function KPICard({ 
  title, 
  value, 
  type = 'currency', 
  tooltip,
  inverseColors = false 
}: KPICardProps) {

  const isFlashing = useValueFlash(value);

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
    <div className="bg-[#1E1E1E] rounded-xl px-6 py-5 flex flex-col shadow-sm h-full w-full">
      <div className="flex justify-between items-start mb-1 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {tooltip && (
          <Tooltip content={<p className="max-w-[200px] text-center">{tooltip}</p>}>
            <button className="text-gray-500 hover:text-gray-300 outline-none">
              <Info size={16} />
            </button>
          </Tooltip>
        )}
      </div>
      
      <div className="min-w-0">
        {/* A key no valor formatado remonta o span a cada numero novo, o que
            reinicia a animacao mesmo quando duas atualizacoes chegam coladas.
            O respiro lateral e a margem negativa ficam sempre aplicados: assim
            o fundo da piscada tem onde aparecer sem deslocar o numero. */}
        <span
          key={displayValue}
          className={cn(
            'text-2xl font-bold tracking-tight truncate block -mx-1.5 px-1.5 rounded-md',
            colorClass,
            isFlashing && 'kpi-flash'
          )}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
