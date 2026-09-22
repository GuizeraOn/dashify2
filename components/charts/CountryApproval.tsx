'use client';

import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { CountryApprovalStat } from '@/hooks/useSummary';
import ShareRing from '@/components/ui/ShareRing';

interface Props {
  data?: CountryApprovalStat[];
  /** Pais atualmente filtrando o dashboard, se houver. */
  selected?: string;
  /** Clicar num pais filtra o dashboard; clicar de novo no mesmo limpa. */
  onSelect?: (country: string | null) => void;
}

type Sort = 'rate' | 'volume';

/**
 * Tentativas minimas para a taxa de um pais ser levada a serio.
 *
 * Um pais com uma unica tentativa aprovada marca 100% e lideraria o ranking
 * sem significar nada. Abaixo deste piso o pais continua na lista — o dado e
 * dele — mas vai para o fim e aparece apagado, para o olho nao o confundir com
 * um resultado de verdade.
 */
const MIN_RESOLVED = 5;

/** Verde, ambar, vermelho — a leitura e o proprio numero. */
function rateColor(rate: number): string {
  if (rate >= 80) return '#22c55e';
  if (rate >= 65) return '#f59e0b';
  return '#ef4444';
}

export default function CountryApproval({ data = [], selected, onSelect }: Props) {
  const [sort, setSort] = useState<Sort>('rate');
  const [hovered, setHovered] = useState<string | null>(null);

  const ordered = useMemo(() => {
    const items = [...data];

    if (sort === 'volume') {
      return items.sort((a, b) => b.resolved - a.resolved);
    }

    // Por taxa: primeiro os que tem volume para sustentar o numero.
    return items.sort((a, b) => {
      const aSolid = a.resolved >= MIN_RESOLVED;
      const bSolid = b.resolved >= MIN_RESOLVED;
      if (aSolid !== bSolid) return aSolid ? -1 : 1;
      return b.approval_rate - a.approval_rate;
    });
  }, [data, sort]);

  const overall = useMemo(() => {
    const approved = data.reduce((total, item) => total + item.approved, 0);
    const resolved = data.reduce((total, item) => total + item.resolved, 0);
    return { approved, resolved, rate: resolved > 0 ? (approved / resolved) * 100 : 0 };
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-sm text-gray-500">
        Sem tentativas no período
      </div>
    );
  }

  const active = hovered ?? selected ?? null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="font-semibold text-gray-200">Aprovação por País</h3>
          {/* A media geral da a referencia: sem ela nao da para saber se 72%
              num pais e bom ou ruim para esta operacao. */}
          <span className="flex-shrink-0 text-xs text-gray-500">
            média {overall.rate.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {selected && (
            <button
              onClick={() => onSelect?.(null)}
              className="text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Limpar {selected}
            </button>
          )}
          {(['rate', 'volume'] as Sort[]).map((option) => (
            <button
              key={option}
              onClick={() => setSort(option)}
              className={cn(
                'transition-colors',
                sort === option ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {option === 'rate' ? 'Taxa' : 'Volume'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col">
          {ordered.map((item) => {
            const isActive = active === item.country;
            const isThin = item.resolved < MIN_RESOLVED;

            return (
              <button
                key={item.country}
                onMouseEnter={() => setHovered(item.country)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(item.country === selected ? null : item.country)}
                title={
                  isThin
                    ? `${item.resolved} tentativa${item.resolved === 1 ? '' : 's'} — volume baixo demais para a taxa significar algo`
                    : undefined
                }
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/5',
                  isActive && 'bg-white/5',
                  isThin && 'opacity-45'
                )}
              >
                {/* O nome fica livre para quebrar em duas linhas: pais de nome
                    longo nao deve espremer os numeros da direita. */}
                <span className="min-w-0 flex-1 text-sm leading-tight text-gray-200">
                  {item.country}
                </span>

                <span className="flex-shrink-0 text-xs tabular-nums text-gray-500">
                  {item.approved}/{item.resolved}
                </span>

                <ShareRing
                  share={item.approval_rate}
                  isActive={isActive}
                  color={rateColor(item.approval_rate)}
                />

                <span className="w-14 flex-shrink-0 text-right text-sm tabular-nums text-white">
                  {item.approval_rate.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
